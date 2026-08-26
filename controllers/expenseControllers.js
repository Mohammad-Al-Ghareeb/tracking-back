const asyncHandler = require("express-async-handler");
const {
  Expense,
  EXPENSE_CATEGORIES,
  validateCreateExpense,
  validateUpdateExpense,
} = require("../models/Expense");
const { localizeJoiError } = require("../utils/localization");

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getMonthFilter = (month) => {
  if (!month) return {};
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  if (monthNumber < 1 || monthNumber > 12) return null;
  return {
    date: {
      $gte: new Date(Date.UTC(year, monthNumber - 1, 1)),
      $lt: new Date(Date.UTC(year, monthNumber, 1)),
    },
  };
};

exports.getExpensesCtrl = asyncHandler(async (req, res) => {
  const { month, category, search = "" } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 20));
  const monthFilter = getMonthFilter(month);

  if (monthFilter === null) {
    return res.status(400).json({ message: req.t("validation.invalid", { field: "month" }) });
  }

  if (category && !EXPENSE_CATEGORIES.includes(category)) {
    return res.status(400).json({ message: req.t("validation.invalid", { field: "category" }) });
  }

  const filter = { ...monthFilter };
  if (category) filter.category = category;

  const normalizedSearch = String(search).trim();
  if (normalizedSearch) {
    const regex = new RegExp(escapeRegex(normalizedSearch), "i");
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const [items, documentCount, filteredTotalResult, categorySummary] = await Promise.all([
    Expense.find(filter)
      .populate("createdBy")
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage),
    Expense.countDocuments(filter),
    Expense.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: monthFilter },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]),
  ]);

  const categoryTotals = Object.fromEntries(EXPENSE_CATEGORIES.map((item) => [item, 0]));
  categorySummary.forEach((item) => {
    if (item?._id && Object.prototype.hasOwnProperty.call(categoryTotals, item._id)) {
      categoryTotals[item._id] = item.total || 0;
    }
  });

  const monthTotal = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
  const filteredTotal = filteredTotalResult[0]?.total || 0;

  res.status(200).json({
    items,
    pagination: {
      page,
      perPage,
      count: items.length,
      documentCount,
    },
    summary: {
      monthTotal,
      filteredTotal,
      categoryTotals,
    },
  });
});

exports.createExpenseCtrl = asyncHandler(async (req, res) => {
  const { error } = validateCreateExpense(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });
  const item = await Expense.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json(item);
});

exports.updateExpenseCtrl = asyncHandler(async (req, res) => {
  const { error } = validateUpdateExpense(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });
  const item = await Expense.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!item) return res.status(404).json({ message: req.t("expenses.notFound") });
  res.status(200).json(item);
});

exports.deleteExpenseCtrl = asyncHandler(async (req, res) => {
  const item = await Expense.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: req.t("expenses.notFound") });
  res.status(200).json({ message: req.t("expenses.deleted") });
});
