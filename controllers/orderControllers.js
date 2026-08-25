const asyncHandler = require("express-async-handler");
const { Order, validateCreateOrder, validateUpdateOrder, validateOrderId } = require("../models/Order");

exports.createOrderCtrl = asyncHandler(async (req, res) => {
  const { error } = validateCreateOrder(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  const order = await Order.create(req.body);
  await order.populate("customer employee");
  res.status(201).json(order);
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
  const orders = await Order.find(filter).populate("customer employee").skip((Number(page) - 1) * Number(perPage)).limit(Number(perPage)).sort({ createdAt: -1 });
  const documentCount = await Order.countDocuments(filter);
  res.status(200).json({ orders, pagination: { page: Number(page), perPage: Number(perPage), count: orders.length, documentCount } });
});

exports.getOrderByIdCtrl = asyncHandler(async (req, res) => {
  const { error } = validateOrderId({ id: req.params.id });
  if (error) return res.status(400).json({ message: "Invalid order ID" });
  const order = await Order.findById(req.params.id).populate("customer employee");
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.status(200).json(order);
});

exports.updateOrderCtrl = asyncHandler(async (req, res) => {
  const { error } = validateUpdateOrder(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  if (req.body.isCancelled === true) req.body.cancelledAt = new Date();
  if (req.body.status === "DELIVERY") req.body.deliveredAt = new Date();
  const order = await Order.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).populate("customer employee");
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.status(200).json(order);
});

exports.deleteOrderCtrl = asyncHandler(async (req, res) => {
  const { error } = validateOrderId({ id: req.params.id });
  if (error) return res.status(400).json({ message: "Invalid order ID" });
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.status(200).json({ message: "Order deleted successfully" });
});
