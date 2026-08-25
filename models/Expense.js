const mongoose = require("mongoose");
const Joi = require("joi");

const EXPENSE_CATEGORIES = ["RAW_MATERIAL", "SALARY", "ELECTRICITY", "TRANSPORT", "MAINTENANCE", "RENT", "OTHER"];

const ExpenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    amount: { type: Number, min: 0, required: true },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Expense = mongoose.model("Expense", ExpenseSchema);
const validateExpense = (obj, requireAll = true) => Joi.object({
  title: requireAll ? Joi.string().trim().min(2).max(150).required() : Joi.string().trim().min(2).max(150),
  category: requireAll ? Joi.string().valid(...EXPENSE_CATEGORIES).required() : Joi.string().valid(...EXPENSE_CATEGORIES),
  amount: requireAll ? Joi.number().min(0).required() : Joi.number().min(0),
  date: requireAll ? Joi.date().required() : Joi.date(),
  description: Joi.string().trim().max(1000).allow("", null),
}).min(requireAll ? 0 : 1).validate(obj);

module.exports = { Expense, EXPENSE_CATEGORIES, validateCreateExpense: (obj) => validateExpense(obj, true), validateUpdateExpense: (obj) => validateExpense(obj, false) };
