const asyncHandler = require("express-async-handler");
const { Order } = require("../models/Order");
const { Expense } = require("../models/Expense");
const { User } = require("../models/User");
const { RawMaterial } = require("../models/RawMaterial");
const { Role } = require("../models/Role");

const { getRoleGroup } = require("../utils/roleAccess");

const getMonthRange = (month) => {
  const value = month && /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = value.split("-").map(Number);
  return { value, start: new Date(Date.UTC(year, monthNumber - 1, 1)), end: new Date(Date.UTC(year, monthNumber, 1)) };
};

exports.getFinanceCtrl = asyncHandler(async (req, res) => {
  const { value, start, end } = getMonthRange(req.query.month);
  const [revenueResult, expenseResult, rawMaterialsAdded] = await Promise.all([
    Order.aggregate([
      { $match: { status: "DELIVERED", deliveredAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          rawMaterialExpenses: {
            $sum: { $cond: [{ $eq: ["$category", "RAW_MATERIAL"] }, "$amount", 0] },
          },
        },
      },
    ]),
    RawMaterial.countDocuments({ createdAt: { $gte: start, $lt: end } }),
  ]);

  const revenue = revenueResult[0]?.total || 0;
  const expenses = expenseResult[0]?.total || 0;
  const rawMaterialExpenses = expenseResult[0]?.rawMaterialExpenses || 0;
  const net = revenue - expenses;

  res.status(200).json({
    month: value,
    revenue,
    expenses,
    profit: Math.max(0, net),
    loss: Math.max(0, -net),
    rawMaterialExpenses,
    rawMaterialsAdded,
  });
});

exports.getSummaryCtrl = asyncHandler(async (req, res) => {
  const productionStatuses = ["CUTTING", "SEWING", "PRINTING", "PACKAGING", "STORAGE", "DELIVERY"];
  const allRoles = await Role.find({});
  const employeeRoleIds = allRoles.filter((role) => getRoleGroup(role) === "EMPLOYEE").map((role) => role._id);
  const customerRoleIds = allRoles.filter((role) => getRoleGroup(role) === "CUSTOMER").map((role) => role._id);
  const [pendingOrders, inProduction, deliveredOrders, users, employees, customers, lowStockMaterials] = await Promise.all([
    Order.countDocuments({ status: "PENDING" }),
    Order.countDocuments({ status: { $in: productionStatuses } }),
    Order.countDocuments({ status: "DELIVERED" }),
    User.countDocuments({ isDeleted: false }),
    User.countDocuments({ isDeleted: false, role: { $in: employeeRoleIds } }),
    User.countDocuments({ isDeleted: false, role: { $in: customerRoleIds } }),
    RawMaterial.countDocuments({ $expr: { $lte: [{ $subtract: ["$stockQuantity", "$reservedQuantity"] }, "$minimumStock"] } }),
  ]);
  res.status(200).json({ pendingOrders, inProduction, deliveredOrders, users, employees, customers, lowStockMaterials });
});
