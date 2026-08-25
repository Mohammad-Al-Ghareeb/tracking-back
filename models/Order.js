const mongoose = require("mongoose");
const Joi = require("joi");

const ORDER_STATUSES = ["PENDING", "CUTTING", "SEWING", "PRINTING", "PACKAGING", "STORAGE", "DELIVERY"];

const OrderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true, trim: true },
  status: { type: String, enum: ORDER_STATUSES, default: "PENDING", required: true },
  expectedFinishDate: { type: Date },
  cost: { type: Number, min: 0, default: 0 },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sizes: { type: [String], default: [] },
  colors: { type: [String], default: [] },
  deliveryLocation: { address: { type: String }, city: String, notes: String },
  isCancelled: { type: Boolean, default: false },
  cancelledAt: Date,
  cancelReason: String,
  deliveredAt: Date,
}, { timestamps: true });

const Order = mongoose.model("Order", OrderSchema);

const deliverySchema = Joi.object({ address: Joi.string().allow(""), city: Joi.string().allow(""), notes: Joi.string().allow("") });
const validateCreateOrder = (obj) => Joi.object({
  customer: Joi.string().hex().length(24).required(),
  description: Joi.string().trim().min(3).max(500).required(),
  status: Joi.string().valid(...ORDER_STATUSES).default("PENDING"),
  expectedFinishDate: Joi.date().optional(),
  cost: Joi.number().min(0).default(0),
  employee: Joi.string().hex().length(24).optional(),
  sizes: Joi.array().items(Joi.string()).optional(),
  colors: Joi.array().items(Joi.string()).optional(),
  deliveryLocation: deliverySchema.optional(),
}).validate(obj);
const validateUpdateOrder = (obj) => Joi.object({
  customer: Joi.string().hex().length(24), description: Joi.string().trim().min(3).max(500), status: Joi.string().valid(...ORDER_STATUSES),
  expectedFinishDate: Joi.date().allow(null), cost: Joi.number().min(0), employee: Joi.string().hex().length(24).allow(null),
  sizes: Joi.array().items(Joi.string()), colors: Joi.array().items(Joi.string()), deliveryLocation: deliverySchema,
  isCancelled: Joi.boolean(), cancelReason: Joi.string().allow("", null),
}).validate(obj);
const validateOrderId = (obj) => Joi.object({ id: Joi.string().hex().length(24).required() }).validate(obj);

module.exports = { Order, ORDER_STATUSES, validateCreateOrder, validateUpdateOrder, validateOrderId };
