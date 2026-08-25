const asyncHandler = require("express-async-handler");
const { Order } = require("../models/Order");
const { Expense } = require("../models/Expense");
const { User } = require("../models/User");
const { RawMaterial } = require("../models/RawMaterial");

const getMonthRange = (month) => {
  const value = month && /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = value.split("-").map(Number);
  return { value, start: new Date(Date.UTC(year, monthNumber - 1, 1)), end: new Date(Date.UTC(year, monthNumber, 1)) };
};

exports.getFinanceCtrl = asyncHandler(async (req, res) => {
  const { value, start, end } = getMonthRange(req.query.month);
  const [revenueResult, expenseResult] = await Promise.all([
    Order.aggregate([
      { $match: { status: "DELIVERY", deliveredAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);
  const revenue = revenueResult[0]?.total || 0;
  const expenses = expenseResult[0]?.total || 0;
  const net = revenue - expenses;
  res.status(200).json({ month: value, revenue, expenses, profit: Math.max(0, net), loss: Math.max(0, -net) });
});

exports.getSummaryCtrl = asyncHandler(async (req, res) => {
  const productionStatuses = ["CUTTING", "SEWING", "PRINTING", "PACKAGING", "STORAGE"];
  const [pendingOrders, inProduction, deliveredOrders, users, lowStockMaterials] = await Promise.all([
    Order.countDocuments({ status: "PENDING" }),
    Order.countDocuments({ status: { $in: productionStatuses } }),
    Order.countDocuments({ status: "DELIVERY" }),
    User.countDocuments({ isDeleted: false }),
    RawMaterial.countDocuments({ isActive: true, $expr: { $lte: [{ $subtract: ["$stockQuantity", "$reservedQuantity"] }, "$minimumStock"] } }),
  ]);
  res.status(200).json({ pendingOrders, inProduction, deliveredOrders, users, lowStockMaterials });
});
