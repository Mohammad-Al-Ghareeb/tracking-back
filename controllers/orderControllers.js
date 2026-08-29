const asyncHandler = require("express-async-handler");
const {
  Order,
  NEXT_STATUS,
  validateCreateOrder,
  validateCustomerOrder,
  validateUpdateOrder,
  validateOrderId,
} = require("../models/Order");
const { RawMaterial } = require("../models/RawMaterial");
const { User } = require("../models/User");
const { localizeJoiError, localizedError } = require("../utils/localization");
const { isEmployeeRole } = require("../utils/roleAccess");
const { calculateConfigurationUnitPrice, validateProductConfigurationPayload, buildOrderDescription } = require("../config/productConfigurations");

const REVIEWABLE_EMPLOYEE_STAGES = new Set(["CUTTING", "SEWING", "PRINTING", "PACKAGING", "STORAGE", "DELIVERY"]);

const populateOrder = (query) =>
  query.populate([
    { path: "customer" },
    { path: "employee" },
    { path: "deliveryEmployee" },
    { path: "rawMaterials.rawMaterial" },
    { path: "stageCompletionRequests.employee" },
    { path: "stageCompletionRequests.reviewedBy" },
  ]);

const buildCustomerMaterialLines = async (req, rawMaterials) => {
  const requestedIds = [...new Set(rawMaterials.map((line) => line.rawMaterialId))];
  if (requestedIds.length !== rawMaterials.length) {
    throw localizedError(req, "orders.duplicateMaterial", 400);
  }

  const materials = await RawMaterial.find({ _id: { $in: requestedIds } });
  if (materials.length !== requestedIds.length) {
    throw localizedError(req, "orders.materialUnavailable", 400);
  }

  const materialMap = new Map(materials.map((item) => [item._id.toString(), item]));
  return rawMaterials.map((line) => {
    const material = materialMap.get(line.rawMaterialId);
    return {
      rawMaterial: material._id,
      nameSnapshot: material.name,
      colorSnapshot: material.color || "",
      quantity: line.quantity,
      unitPriceSnapshot: material.unitPrice,
      subtotal: material.unitPrice * line.quantity,
    };
  });
};

const reserveIncreases = async (req, deltas) => {
  const applied = [];
  try {
    for (const { rawMaterial, quantity } of deltas) {
      const updated = await RawMaterial.findOneAndUpdate(
        {
          _id: rawMaterial,
          $expr: {
            $gte: [{ $subtract: ["$stockQuantity", "$reservedQuantity"] }, quantity],
          },
        },
        { $inc: { reservedQuantity: quantity } },
        { new: true }
      );

      if (!updated) {
        throw localizedError(req, "orders.stockChanged", 409);
      }
      applied.push({ rawMaterial, quantity });
    }
    return applied;
  } catch (error) {
    for (const item of applied) {
      await RawMaterial.updateOne(
        { _id: item.rawMaterial },
        { $inc: { reservedQuantity: -item.quantity } }
      );
    }
    throw error;
  }
};

const rollbackReservationIncreases = async (applied) => {
  for (const item of applied) {
    await RawMaterial.updateOne(
      { _id: item.rawMaterial },
      { $inc: { reservedQuantity: -item.quantity } }
    );
  }
};

const releaseReservationDecreases = async (deltas) => {
  for (const { rawMaterial, quantity } of deltas) {
    await RawMaterial.updateOne(
      { _id: rawMaterial },
      { $inc: { reservedQuantity: quantity } }
    );
  }
};

exports.createOrderCtrl = asyncHandler(async (req, res) => {
  const { error } = validateCreateOrder(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });
  const order = await Order.create({ ...req.body, totalPrice: Number(req.body.additionalCost || 0) });
  res.status(201).json(await populateOrder(Order.findById(order._id)));
});

exports.createMyOrderCtrl = asyncHandler(async (req, res) => {
  const { error } = validateCustomerOrder(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });

  const isConfigured = Boolean(req.body.productType);
  const configError = isConfigured ? validateProductConfigurationPayload(req.body) : null;
  if (configError) return res.status(400).json({ message: configError });
  const materialInputs = isConfigured ? [{ rawMaterialId: req.body.materialId, quantity: req.body.orderQuantity }] : req.body.rawMaterials;
  const lines = await buildCustomerMaterialLines(req, materialInputs);
  const applied = await reserveIncreases(req, lines.map((line) => ({ rawMaterial: line.rawMaterial, quantity: line.quantity })));

  try {
    const materialCost = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const configurationUnitPrice = isConfigured ? calculateConfigurationUnitPrice(req.body.productType, req.body.designAttributes, req.body.customizations) : 0;
    const configurationCost = configurationUnitPrice * Number(req.body.orderQuantity || 1);
    const order = await Order.create({
      customer: req.user.id,
      description: isConfigured ? buildOrderDescription(req.body.productType, req.body.designAttributes) : req.body.description,
      notes: req.body.notes?.trim() || null,
      productType: req.body.productType,
      designAttributes: req.body.designAttributes || {},
      measurementMode: req.body.measurementMode,
      standardSize: req.body.standardSize || null,
      measurements: req.body.measurements || {},
      customizations: req.body.customizations || {},
      orderQuantity: Number(req.body.orderQuantity || 1),
      configurationUnitPrice,
      configurationCost,
      rawMaterials: lines,
      materialCost,
      additionalCost: 0,
      totalPrice: materialCost + configurationCost,
      deliveryLocation: req.body.deliveryLocation,
      status: "PENDING",
    });
    res.status(201).json(await populateOrder(Order.findById(order._id)));
  } catch (error) {
    await rollbackReservationIncreases(applied);
    throw error;
  }
});

exports.updateMyOrderCtrl = asyncHandler(async (req, res) => {
  const { error: idError } = validateOrderId({ id: req.params.id });
  if (idError) return res.status(400).json({ message: req.t("orders.invalidId") });

  const { error } = validateCustomerOrder(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });

  const existingOrder = await Order.findOne({ _id: req.params.id, customer: req.user.id });
  if (!existingOrder) return res.status(404).json({ message: req.t("orders.notFound") });
  if (existingOrder.status !== "PENDING" || existingOrder.inventoryConsumed || existingOrder.isCancelled || existingOrder.isRejected) {
    return res.status(409).json({ message: req.t("orders.notEditable") });
  }

  const isConfigured = Boolean(req.body.productType);
  const configError = isConfigured ? validateProductConfigurationPayload(req.body) : null;
  if (configError) return res.status(400).json({ message: configError });
  const materialInputs = isConfigured ? [{ rawMaterialId: req.body.materialId, quantity: req.body.orderQuantity }] : req.body.rawMaterials;
  const lines = await buildCustomerMaterialLines(req, materialInputs);
  const previousQuantities = new Map(
    existingOrder.rawMaterials.map((line) => [line.rawMaterial.toString(), Number(line.quantity)])
  );
  const nextQuantities = new Map(
    lines.map((line) => [line.rawMaterial.toString(), Number(line.quantity)])
  );
  const materialIds = new Set([...previousQuantities.keys(), ...nextQuantities.keys()]);
  const reservationIncreases = [];
  const reservationDecreases = [];

  for (const rawMaterial of materialIds) {
    const delta = (nextQuantities.get(rawMaterial) || 0) - (previousQuantities.get(rawMaterial) || 0);
    if (delta > 0) reservationIncreases.push({ rawMaterial, quantity: delta });
    if (delta < 0) reservationDecreases.push({ rawMaterial, quantity: delta });
  }

  const appliedIncreases = await reserveIncreases(req, reservationIncreases);
  const materialCost = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const configurationUnitPrice = isConfigured ? calculateConfigurationUnitPrice(req.body.productType, req.body.designAttributes, req.body.customizations) : Number(existingOrder.configurationUnitPrice || 0);
  const configurationCost = isConfigured ? configurationUnitPrice * Number(req.body.orderQuantity || 1) : Number(existingOrder.configurationCost || 0);
  const deliveryLocation = {
    address: req.body.deliveryLocation?.address || "",
    city: req.body.deliveryLocation?.city || "",
    notes: req.body.deliveryLocation?.notes || "",
  };

  let updatedOrder;
  try {
    updatedOrder = await Order.findOneAndUpdate(
      {
        _id: existingOrder._id,
        customer: req.user.id,
        status: "PENDING",
        inventoryConsumed: false,
        updatedAt: existingOrder.updatedAt,
      },
      {
        $set: {
          description: isConfigured ? buildOrderDescription(req.body.productType, req.body.designAttributes) : req.body.description,
          notes: req.body.notes?.trim() || null,
          productType: req.body.productType,
          designAttributes: req.body.designAttributes || {},
          measurementMode: req.body.measurementMode,
          standardSize: req.body.standardSize || null,
          measurements: req.body.measurements || {},
          customizations: req.body.customizations || {},
          orderQuantity: Number(req.body.orderQuantity || 1),
          configurationUnitPrice,
          configurationCost,
          rawMaterials: lines,
          materialCost,
          totalPrice: materialCost + configurationCost + Number(existingOrder.additionalCost || 0),
          deliveryLocation,
        },
      },
      { new: true, runValidators: true }
    );
  } catch (updateError) {
    await rollbackReservationIncreases(appliedIncreases);
    throw updateError;
  }

  if (!updatedOrder) {
    await rollbackReservationIncreases(appliedIncreases);
    return res.status(409).json({ message: req.t("orders.notEditable") });
  }

  await releaseReservationDecreases(reservationDecreases);
  res.status(200).json(await populateOrder(Order.findById(updatedOrder._id)));
});

exports.getMyOrdersCtrl = asyncHandler(async (req, res) => {
  const { page = 1, perPage = 12 } = req.query;
  const filter = { customer: req.user.id };
  const orders = await populateOrder(Order.find(filter))
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(perPage))
    .limit(Number(perPage));
  const documentCount = await Order.countDocuments(filter);
  res.status(200).json({ orders, pagination: { page: Number(page), perPage: Number(perPage), count: orders.length, documentCount } });
});

exports.getMyOrderByIdCtrl = asyncHandler(async (req, res) => {
  const order = await populateOrder(Order.findOne({ _id: req.params.id, customer: req.user.id }));
  if (!order) return res.status(404).json({ message: req.t("orders.notFound") });
  res.status(200).json(order);
});

exports.getAssignedOrdersCtrl = asyncHandler(async (req, res) => {
  const { page = 1, perPage = 50, status } = req.query;
  const filter = { $or: [{ employee: req.user.id }, { deliveryEmployee: req.user.id }] };
  if (status) filter.status = status;
  const orders = await populateOrder(Order.find(filter))
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(perPage))
    .limit(Number(perPage));
  const documentCount = await Order.countDocuments(filter);
  res.status(200).json({ orders, pagination: { page: Number(page), perPage: Number(perPage), count: orders.length, documentCount } });
});

exports.getAssignedOrderByIdCtrl = asyncHandler(async (req, res) => {
  const { error } = validateOrderId({ id: req.params.id });
  if (error) return res.status(400).json({ message: req.t("orders.invalidId") });
  const order = await populateOrder(Order.findOne({ _id: req.params.id, $or: [{ employee: req.user.id }, { deliveryEmployee: req.user.id }] }));
  if (!order) return res.status(404).json({ message: req.t("orders.notFound") });
  res.status(200).json(order);
});

exports.requestStageCompletionCtrl = asyncHandler(async (req, res) => {
  const { error } = validateOrderId({ id: req.params.id });
  if (error) return res.status(400).json({ message: req.t("orders.invalidId") });

  const order = await Order.findOne({ _id: req.params.id, $or: [{ employee: req.user.id }, { deliveryEmployee: req.user.id }] });
  if (!order) return res.status(404).json({ message: req.t("orders.notFound") });
  if (!REVIEWABLE_EMPLOYEE_STAGES.has(order.status)) {
    return res.status(409).json({ message: req.t("orders.stageCompletionUnavailable") });
  }
  const responsibleEmployee = order.status === "DELIVERY" ? order.deliveryEmployee : order.employee;
  if (String(responsibleEmployee || "") !== String(req.user.id)) {
    return res.status(403).json({ message: req.t("orders.stageCompletionUnavailable") });
  }

  const alreadyPending = order.stageCompletionRequests.some(
    (item) => item.stage === order.status && item.status === "PENDING"
  );
  if (alreadyPending) {
    return res.status(409).json({ message: req.t("orders.stageCompletionExists") });
  }

  order.stageCompletionRequests.push({
    stage: order.status,
    employee: req.user.id,
    status: "PENDING",
    requestedAt: new Date(),
  });
  await order.save();
  res.status(201).json(await populateOrder(Order.findById(order._id)));
});

exports.getAllOrdersCtrl = asyncHandler(async (req, res) => {
  const { page = 1, perPage = 10, status, employeeId, userId, from, to } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (employeeId) filter.employee = employeeId;
  if (userId) filter.customer = userId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  const orders = await populateOrder(Order.find(filter))
    .skip((Number(page) - 1) * Number(perPage))
    .limit(Number(perPage))
    .sort({ createdAt: -1 });
  const documentCount = await Order.countDocuments(filter);
  res.status(200).json({ orders, pagination: { page: Number(page), perPage: Number(perPage), count: orders.length, documentCount } });
});

exports.getOrderByIdCtrl = asyncHandler(async (req, res) => {
  const { error } = validateOrderId({ id: req.params.id });
  if (error) return res.status(400).json({ message: req.t("orders.invalidId") });
  const order = await populateOrder(Order.findById(req.params.id));
  if (!order) return res.status(404).json({ message: req.t("orders.notFound") });
  res.status(200).json(order);
});

exports.updateOrderCtrl = asyncHandler(async (req, res) => {
  const { error } = validateUpdateOrder(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: req.t("orders.notFound") });
  Object.assign(order, req.body);
  order.totalPrice = Number(order.materialCost || 0) + Number(order.configurationCost || 0) + Number(order.additionalCost || 0);
  await order.save();
  res.status(200).json(await populateOrder(Order.findById(order._id)));
});

exports.assignOrderCtrl = asyncHandler(async (req, res) => {
  const { employee, expectedFinishDate, additionalCost = 0 } = req.body;
  if (!employee || !expectedFinishDate) {
    return res.status(400).json({ message: req.t("orders.assignmentRequired") });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: req.t("orders.notFound") });
  const assignedEmployee = await User.findById(employee).populate("role");
  if (!assignedEmployee || assignedEmployee.isDeleted || !assignedEmployee.isActive) {
    return res.status(400).json({ message: req.t("orders.employeeUnavailable") });
  }

  if (!isEmployeeRole(assignedEmployee.role)) {
    return res.status(400).json({ message: req.t("orders.notEmployee") });
  }

  const employeeChanged = order.employee && order.employee.toString() !== employee;
  if (employeeChanged) {
    for (const request of order.stageCompletionRequests) {
      if (request.status === "PENDING") {
        request.status = "REJECTED";
        request.reviewedAt = new Date();
        request.reviewedBy = req.user.id;
      }
    }
  }

  order.employee = employee;
  order.expectedFinishDate = expectedFinishDate;
  order.additionalCost = Math.max(0, Number(additionalCost) || 0);
  order.totalPrice = Number(order.materialCost || 0) + Number(order.configurationCost || 0) + order.additionalCost;
  await order.save();
  res.status(200).json(await populateOrder(Order.findById(order._id)));
});

exports.updateOrderStatusCtrl = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: req.t("orders.notFound") });
  const nextStatus = req.body.status;
  if (order.isCancelled || order.isRejected || NEXT_STATUS[order.status] !== nextStatus) {
    return res.status(400).json({ message: req.t("orders.invalidTransition", { from: order.status, to: nextStatus }) });
  }
  if (order.status === "DELIVERY" && nextStatus === "DELIVERED") {
    return res.status(409).json({ message: req.t("orders.deliveryCompletionRequired") });
  }

  if (order.status === "PENDING") {
    if (!order.employee || !order.expectedFinishDate) {
      return res.status(400).json({ message: req.t("orders.startRequirements") });
    }
    if (!order.inventoryConsumed) {
      for (const line of order.rawMaterials) {
        const material = await RawMaterial.findById(line.rawMaterial);
        if (!material || material.reservedQuantity < line.quantity || material.stockQuantity < line.quantity) {
          return res.status(409).json({ message: req.t("orders.reservedUnavailable") });
        }
      }
      for (const line of order.rawMaterials) {
        await RawMaterial.updateOne(
          { _id: line.rawMaterial },
          { $inc: { stockQuantity: -line.quantity, reservedQuantity: -line.quantity } }
        );
      }
      order.inventoryConsumed = true;
    }
  }

  const pendingCompletion = order.stageCompletionRequests.find(
    (item) =>
      item.status === "PENDING" &&
      item.stage === order.status &&
      String(item.employee) === String(order.status === "DELIVERY" ? order.deliveryEmployee : order.employee || "")
  );
  if (pendingCompletion) {
    pendingCompletion.status = "APPROVED";
    pendingCompletion.reviewedAt = new Date();
    pendingCompletion.reviewedBy = req.user.id;
  }

  if (nextStatus === "DELIVERY" && !order.deliveryEmployee) return res.status(400).json({ message: req.t("orders.deliveryEmployeeRequired") });
  order.status = nextStatus;
  if (nextStatus === "DELIVERED" && !order.deliveredAt) order.deliveredAt = new Date();
  await order.save();
  res.status(200).json(await populateOrder(Order.findById(order._id)));
});

const reviewStageCompletion = async (req, res, decision) => {
  const { error } = validateOrderId({ id: req.params.id });
  if (error) return res.status(400).json({ message: req.t("orders.invalidId") });

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: req.t("orders.notFound") });
  const completionRequest = order.stageCompletionRequests.id(req.params.requestId);
  if (!completionRequest) {
    return res.status(404).json({ message: req.t("orders.stageCompletionNotFound") });
  }
  if (completionRequest.status !== "PENDING") {
    return res.status(409).json({ message: req.t("orders.stageCompletionReviewed") });
  }

  if (decision === "APPROVED") {
    if (
      completionRequest.stage !== order.status ||
      String(completionRequest.employee) !== String(order.status === "DELIVERY" ? order.deliveryEmployee : order.employee || "") ||
      !NEXT_STATUS[order.status]
    ) {
      return res.status(409).json({ message: req.t("orders.stageCompletionOutdated") });
    }
    const nextStatus = NEXT_STATUS[order.status];
    completionRequest.status = "APPROVED";
    completionRequest.reviewedAt = new Date();
    completionRequest.reviewedBy = req.user.id;
    if (nextStatus === "DELIVERY" && !order.deliveryEmployee) return res.status(400).json({ message: req.t("orders.deliveryEmployeeRequired") });
    order.status = nextStatus;
    if (nextStatus === "DELIVERED" && !order.deliveredAt) order.deliveredAt = new Date();
  } else {
    completionRequest.status = "REJECTED";
    completionRequest.reviewedAt = new Date();
    completionRequest.reviewedBy = req.user.id;
  }

  await order.save();
  return res.status(200).json(await populateOrder(Order.findById(order._id)));
};

exports.approveStageCompletionCtrl = asyncHandler(async (req, res) => {
  await reviewStageCompletion(req, res, "APPROVED");
});

exports.rejectStageCompletionCtrl = asyncHandler(async (req, res) => {
  await reviewStageCompletion(req, res, "REJECTED");
});

exports.deleteOrderCtrl = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: req.t("orders.notFound") });
  if (order.status === "PENDING" && !order.inventoryConsumed) {
    for (const line of order.rawMaterials) {
      await RawMaterial.updateOne(
        { _id: line.rawMaterial },
        { $inc: { reservedQuantity: -line.quantity } }
      );
    }
  }
  await order.deleteOne();
  res.status(200).json({ message: req.t("orders.deleted") });
});

exports.cancelMyOrderCtrl = asyncHandler(async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, customer: req.user.id, status: "PENDING", inventoryConsumed: { $ne: true }, isCancelled: { $ne: true }, isRejected: { $ne: true } },
    { $set: { isCancelled: true, cancelledAt: new Date(), cancelReason: req.body?.reason || null } },
    { new: false }
  );
  if (!order) {
    const exists = await Order.exists({ _id: req.params.id, customer: req.user.id });
    return res.status(exists ? 409 : 404).json({ message: req.t(exists ? "orders.notEditable" : "orders.notFound") });
  }
  for (const line of order.rawMaterials) {
    await RawMaterial.updateOne({ _id: line.rawMaterial, reservedQuantity: { $gte: line.quantity } }, { $inc: { reservedQuantity: -line.quantity } });
  }
  res.status(200).json(await populateOrder(Order.findById(order._id)));
});

exports.rejectOrderCtrl = asyncHandler(async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: "PENDING", inventoryConsumed: { $ne: true }, isCancelled: { $ne: true }, isRejected: { $ne: true } },
    { $set: { isRejected: true, rejectedAt: new Date(), rejectReason: req.body?.reason || null, rejectedBy: req.user.id } },
    { new: false }
  );
  if (!order) {
    const exists = await Order.exists({ _id: req.params.id });
    return res.status(exists ? 409 : 404).json({ message: req.t(exists ? "orders.notEditable" : "orders.notFound") });
  }
  for (const line of order.rawMaterials) {
    await RawMaterial.updateOne({ _id: line.rawMaterial, reservedQuantity: { $gte: line.quantity } }, { $inc: { reservedQuantity: -line.quantity } });
  }
  res.status(200).json(await populateOrder(Order.findById(order._id)));
});

exports.assignDeliveryEmployeeCtrl = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: req.t("orders.notFound") });
  const employee = await User.findById(req.body.employee).populate("role");
  if (!employee || employee.isDeleted || !employee.isActive || !isEmployeeRole(employee.role)) return res.status(400).json({ message: req.t("orders.employeeUnavailable") });
  order.deliveryEmployee = employee._id;
  await order.save();
  res.status(200).json(await populateOrder(Order.findById(order._id)));
});
