const asyncHandler = require("express-async-handler");
const { Order, NEXT_STATUS, validateCreateOrder, validateCustomerOrder, validateUpdateOrder, validateOrderId } = require("../models/Order");
const { RawMaterial } = require("../models/RawMaterial");
const { User } = require("../models/User");
const { localizeJoiError, localizedError } = require("../utils/localization");

const populateOrder = (query) => query.populate("customer employee rawMaterials.rawMaterial");

exports.createOrderCtrl = asyncHandler(async (req, res) => {
  const { error } = validateCreateOrder(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });
  const order = await Order.create({ ...req.body, totalPrice: Number(req.body.additionalCost || 0) });
  res.status(201).json(await populateOrder(Order.findById(order._id)));
});

exports.createMyOrderCtrl = asyncHandler(async (req, res) => {
  const { error } = validateCustomerOrder(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });
  const requestedIds = [...new Set(req.body.rawMaterials.map((line) => line.rawMaterialId))];
  if (requestedIds.length !== req.body.rawMaterials.length) return res.status(400).json({ message: req.t("orders.duplicateMaterial") });
  const materials = await RawMaterial.find({ _id: { $in: requestedIds }, isActive: true });
  if (materials.length !== requestedIds.length) return res.status(400).json({ message: req.t("orders.materialUnavailable") });
  const materialMap = new Map(materials.map((item) => [item._id.toString(), item]));
  const lines = req.body.rawMaterials.map((line) => {
    const material = materialMap.get(line.rawMaterialId);
    const available = material.stockQuantity - material.reservedQuantity;
    if (available < line.quantity) throw localizedError(req, "orders.insufficientStock", 409, { material: `${material.name} ${material.color || ""}`.trim() });
    return { rawMaterial: material._id, nameSnapshot: material.name, colorSnapshot: material.color || "", quantity: line.quantity, unitPriceSnapshot: material.unitPrice, subtotal: material.unitPrice * line.quantity };
  });
  const reserved = [];
  try {
    for (const line of lines) {
      const updated = await RawMaterial.findOneAndUpdate({ _id: line.rawMaterial, isActive: true, $expr: { $gte: [{ $subtract: ["$stockQuantity", "$reservedQuantity"] }, line.quantity] } }, { $inc: { reservedQuantity: line.quantity } }, { new: true });
      if (!updated) throw localizedError(req, "orders.stockChanged", 409);
      reserved.push(line);
    }
    const materialCost = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const order = await Order.create({ customer: req.user.id, description: req.body.description, notes: req.body.notes, rawMaterials: lines, materialCost, additionalCost: 0, totalPrice: materialCost, deliveryLocation: req.body.deliveryLocation, status: "PENDING" });
    res.status(201).json(await populateOrder(Order.findById(order._id)));
  } catch (err) {
    for (const line of reserved) await RawMaterial.updateOne({ _id: line.rawMaterial }, { $inc: { reservedQuantity: -line.quantity } });
    throw err;
  }
});

exports.getMyOrdersCtrl = asyncHandler(async (req, res) => { const { page = 1, perPage = 12 } = req.query; const filter = { customer: req.user.id }; const orders = await populateOrder(Order.find(filter)).sort({ createdAt: -1 }).skip((Number(page) - 1) * Number(perPage)).limit(Number(perPage)); const documentCount = await Order.countDocuments(filter); res.status(200).json({ orders, pagination: { page: Number(page), perPage: Number(perPage), count: orders.length, documentCount } }); });
exports.getMyOrderByIdCtrl = asyncHandler(async (req, res) => { const order = await populateOrder(Order.findOne({ _id: req.params.id, customer: req.user.id })); if (!order) return res.status(404).json({ message: req.t("orders.notFound") }); res.status(200).json(order); });
exports.getAssignedOrdersCtrl = asyncHandler(async (req, res) => { const { page = 1, perPage = 50, status } = req.query; const filter = { employee: req.user.id }; if (status) filter.status = status; const orders = await populateOrder(Order.find(filter)).sort({ createdAt: -1 }).skip((Number(page) - 1) * Number(perPage)).limit(Number(perPage)); const documentCount = await Order.countDocuments(filter); res.status(200).json({ orders, pagination: { page: Number(page), perPage: Number(perPage), count: orders.length, documentCount } }); });
exports.getAssignedOrderByIdCtrl = asyncHandler(async (req, res) => { const { error } = validateOrderId({ id: req.params.id }); if (error) return res.status(400).json({ message: req.t("orders.invalidId") }); const order = await populateOrder(Order.findOne({ _id: req.params.id, employee: req.user.id })); if (!order) return res.status(404).json({ message: req.t("orders.notFound") }); res.status(200).json(order); });
exports.getAllOrdersCtrl = asyncHandler(async (req, res) => { const { page = 1, perPage = 10, status, employeeId, userId, from, to } = req.query; const filter = {}; if (status) filter.status = status; if (employeeId) filter.employee = employeeId; if (userId) filter.customer = userId; if (from || to) { filter.createdAt = {}; if (from) filter.createdAt.$gte = new Date(from); if (to) filter.createdAt.$lte = new Date(to); } const orders = await populateOrder(Order.find(filter)).skip((Number(page) - 1) * Number(perPage)).limit(Number(perPage)).sort({ createdAt: -1 }); const documentCount = await Order.countDocuments(filter); res.status(200).json({ orders, pagination: { page: Number(page), perPage: Number(perPage), count: orders.length, documentCount } }); });
exports.getOrderByIdCtrl = asyncHandler(async (req, res) => { const { error } = validateOrderId({ id: req.params.id }); if (error) return res.status(400).json({ message: req.t("orders.invalidId") }); const order = await populateOrder(Order.findById(req.params.id)); if (!order) return res.status(404).json({ message: req.t("orders.notFound") }); res.status(200).json(order); });
exports.updateOrderCtrl = asyncHandler(async (req, res) => { const { error } = validateUpdateOrder(req.body); if (error) return res.status(400).json({ message: localizeJoiError(req, error) }); const order = await Order.findById(req.params.id); if (!order) return res.status(404).json({ message: req.t("orders.notFound") }); Object.assign(order, req.body); order.totalPrice = Number(order.materialCost || 0) + Number(order.additionalCost || 0); await order.save(); res.status(200).json(await populateOrder(Order.findById(order._id))); });

exports.assignOrderCtrl = asyncHandler(async (req, res) => {
  const { employee, expectedFinishDate, additionalCost = 0 } = req.body;
  if (!employee || !expectedFinishDate) return res.status(400).json({ message: req.t("orders.assignmentRequired") });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: req.t("orders.notFound") });
  const assignedEmployee = await User.findById(employee).populate("role");
  if (!assignedEmployee || assignedEmployee.isDeleted || !assignedEmployee.isActive) return res.status(400).json({ message: req.t("orders.employeeUnavailable") });
  const employeeRole = String(assignedEmployee.role?.name || "").trim().toLowerCase();
  if (!["employee", "worker", "موظف", "عامل"].includes(employeeRole)) return res.status(400).json({ message: req.t("orders.notEmployee") });
  order.employee = employee; order.expectedFinishDate = expectedFinishDate; order.additionalCost = Math.max(0, Number(additionalCost) || 0); order.totalPrice = Number(order.materialCost || 0) + order.additionalCost; await order.save();
  res.status(200).json(await populateOrder(Order.findById(order._id)));
});

exports.updateOrderStatusCtrl = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: req.t("orders.notFound") });
  const nextStatus = req.body.status;
  if (NEXT_STATUS[order.status] !== nextStatus) return res.status(400).json({ message: req.t("orders.invalidTransition", { from: order.status, to: nextStatus }) });
  if (order.status === "PENDING") {
    if (!order.employee || !order.expectedFinishDate) return res.status(400).json({ message: req.t("orders.startRequirements") });
    if (!order.inventoryConsumed) {
      for (const line of order.rawMaterials) { const material = await RawMaterial.findById(line.rawMaterial); if (!material || material.reservedQuantity < line.quantity || material.stockQuantity < line.quantity) return res.status(409).json({ message: req.t("orders.reservedUnavailable") }); }
      for (const line of order.rawMaterials) await RawMaterial.updateOne({ _id: line.rawMaterial }, { $inc: { stockQuantity: -line.quantity, reservedQuantity: -line.quantity } });
      order.inventoryConsumed = true;
    }
  }
  order.status = nextStatus;
  if (nextStatus === "DELIVERY" && !order.deliveredAt) order.deliveredAt = new Date();
  await order.save();
  res.status(200).json(await populateOrder(Order.findById(order._id)));
});

exports.deleteOrderCtrl = asyncHandler(async (req, res) => { const order = await Order.findById(req.params.id); if (!order) return res.status(404).json({ message: req.t("orders.notFound") }); if (order.status === "PENDING" && !order.inventoryConsumed) { for (const line of order.rawMaterials) await RawMaterial.updateOne({ _id: line.rawMaterial }, { $inc: { reservedQuantity: -line.quantity } }); } await order.deleteOne(); res.status(200).json({ message: req.t("orders.deleted") }); });
