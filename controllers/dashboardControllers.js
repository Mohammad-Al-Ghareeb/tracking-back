const asyncHandler = require("express-async-handler");
const { Order } = require("../models/Order");
const { Expense } = require("../models/Expense");
const { User } = require("../models/User");
const { RawMaterial } = require("../models/RawMaterial");
const { Role } = require("../models/Role");

const EMPLOYEE_ROLE_NAMES = ["employee", "worker", "موظف", "عامل"];
const CUSTOMER_ROLE_NAMES = ["customer", "user", "مستخدم", "زبون"];

const getMonthRange = (month) => {
  const value = month && /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = value.split("-").map(Number);
  return { value, start: new Date(Date.UTC(year, monthNumber - 1, 1)), end: new Date(Date.UTC(year, monthNumber, 1)) };
};

const monthKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

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

exports.getMonthlyStatsCtrl = asyncHandler(async (req, res) => {
  const requestedMonths = Number(req.query.months);
  const months = Number.isInteger(requestedMonths) ? Math.min(24, Math.max(1, requestedMonths)) : 12;
  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - (months - 1), 1));
  const end = new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() + 1, 1));

  const [revenueRows, expenseRows, inventoryRows] = await Promise.all([
    Order.aggregate([
      { $match: { status: "DELIVERY", deliveredAt: { $gte: start, $lt: end } } },
      { $group: { _id: { year: { $year: "$deliveredAt" }, month: { $month: "$deliveredAt" } }, revenue: { $sum: "$totalPrice" } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: {
        _id: { year: { $year: "$date" }, month: { $month: "$date" } },
        expenses: { $sum: "$amount" },
        rawMaterialExpenses: { $sum: { $cond: [{ $eq: ["$category", "RAW_MATERIAL"] }, "$amount", 0] } },
      } },
    ]),
    RawMaterial.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, rawMaterialsAdded: { $sum: 1 } } },
    ]),
  ]);

  const byMonth = new Map();
  for (let offset = 0; offset < months; offset += 1) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
    const key = monthKey(date.getUTCFullYear(), date.getUTCMonth() + 1);
    byMonth.set(key, { month: key, revenue: 0, expenses: 0, profit: 0, loss: 0, rawMaterialExpenses: 0, rawMaterialsAdded: 0 });
  }

  revenueRows.forEach((row) => {
    const entry = byMonth.get(monthKey(row._id.year, row._id.month));
    if (entry) entry.revenue = row.revenue || 0;
  });
  expenseRows.forEach((row) => {
    const entry = byMonth.get(monthKey(row._id.year, row._id.month));
    if (entry) {
      entry.expenses = row.expenses || 0;
      entry.rawMaterialExpenses = row.rawMaterialExpenses || 0;
    }
  });
  inventoryRows.forEach((row) => {
    const entry = byMonth.get(monthKey(row._id.year, row._id.month));
    if (entry) entry.rawMaterialsAdded = row.rawMaterialsAdded || 0;
  });

  const statistics = Array.from(byMonth.values()).map((entry) => {
    const net = entry.revenue - entry.expenses;
    return { ...entry, profit: Math.max(0, net), loss: Math.max(0, -net) };
  }).reverse();

  res.status(200).json({ months, statistics });
});

exports.getSummaryCtrl = asyncHandler(async (req, res) => {
  const productionStatuses = ["CUTTING", "SEWING", "PRINTING", "PACKAGING", "STORAGE"];
  const [employeeRoleIds, customerRoleIds] = await Promise.all([
    Role.find({ name: { $in: EMPLOYEE_ROLE_NAMES } }).distinct("_id"),
    Role.find({ name: { $in: CUSTOMER_ROLE_NAMES } }).distinct("_id"),
  ]);
  const [pendingOrders, inProduction, deliveredOrders, users, employees, customers, lowStockMaterials] = await Promise.all([
    Order.countDocuments({ status: "PENDING" }),
    Order.countDocuments({ status: { $in: productionStatuses } }),
    Order.countDocuments({ status: "DELIVERY" }),
    User.countDocuments({ isDeleted: false }),
    User.countDocuments({ isDeleted: false, role: { $in: employeeRoleIds } }),
    User.countDocuments({ isDeleted: false, role: { $in: customerRoleIds } }),
    RawMaterial.countDocuments({ isActive: true, $expr: { $lte: [{ $subtract: ["$stockQuantity", "$reservedQuantity"] }, "$minimumStock"] } }),
  ]);
  res.status(200).json({ pendingOrders, inProduction, deliveredOrders, users, employees, customers, lowStockMaterials });
});
