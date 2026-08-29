const mongoose = require("mongoose");
const Joi = require("joi");
const { PRODUCT_TYPES } = require("../config/productConfigurations");

const ORDER_STATUSES = ["PENDING", "CUTTING", "SEWING", "PRINTING", "PACKAGING", "STORAGE", "DELIVERY", "DELIVERED"];
const NEXT_STATUS = { PENDING: "CUTTING", CUTTING: "SEWING", SEWING: "PRINTING", PRINTING: "PACKAGING", PACKAGING: "STORAGE", STORAGE: "DELIVERY", DELIVERY: "DELIVERED" };

const OrderMaterialSchema = new mongoose.Schema({
  rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: "RawMaterial", required: true },
  nameSnapshot: { type: String, required: true },
  colorSnapshot: { type: String, default: "" },
  quantity: { type: Number, min: 1, required: true, validate: { validator: Number.isInteger, message: "Quantity must be an integer" } },
  unitPriceSnapshot: { type: Number, min: 0, required: true },
  subtotal: { type: Number, min: 0, required: true },
}, { _id: false });

const StageCompletionRequestSchema = new mongoose.Schema({
  stage: { type: String, enum: ORDER_STATUSES, required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", required: true },
  requestedAt: { type: Date, default: Date.now, required: true },
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { _id: true });

const OrderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deliveryEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  description: { type: String, required: true, trim: true },
  notes: { type: String, trim: true, default: null },
  productType: { type: String, enum: PRODUCT_TYPES },
  designAttributes: { type: mongoose.Schema.Types.Mixed, default: {} },
  measurementMode: { type: String, enum: ["STANDARD", "CUSTOM"] },
  standardSize: { type: String, trim: true, default: null },
  measurements: { type: mongoose.Schema.Types.Mixed, default: {} },
  customizations: { type: mongoose.Schema.Types.Mixed, default: {} },
  orderQuantity: { type: Number, min: 1, default: 1, validate: { validator: Number.isInteger, message: "Order quantity must be an integer" } },
  configurationUnitPrice: { type: Number, min: 0, default: 0 },
  configurationCost: { type: Number, min: 0, default: 0 },
  rawMaterials: { type: [OrderMaterialSchema], default: [] },
  materialCost: { type: Number, min: 0, default: 0 },
  additionalCost: { type: Number, min: 0, default: 0 },
  totalPrice: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ORDER_STATUSES, default: "PENDING", required: true },
  expectedFinishDate: Date,
  deliveryLocation: { address: String, city: String, notes: String },
  isCancelled: { type: Boolean, default: false },
  cancelledAt: Date,
  cancelReason: String,
  isRejected: { type: Boolean, default: false },
  rejectedAt: Date,
  rejectReason: String,
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deliveredAt: Date,
  inventoryConsumed: { type: Boolean, default: false },
  stageCompletionRequests: { type: [StageCompletionRequestSchema], default: [] },
}, { timestamps: true });

const Order = mongoose.model("Order", OrderSchema);
const deliverySchema = Joi.object({ address: Joi.string().allow(""), city: Joi.string().allow(""), notes: Joi.string().allow("") });
const legacyCustomerOrderSchema = Joi.object({
  description: Joi.string().trim().min(3).max(500).required(),
  notes: Joi.string().trim().max(1500).allow("", null),
  rawMaterials: Joi.array().items(Joi.object({ rawMaterialId: Joi.string().hex().length(24).required(), quantity: Joi.number().integer().min(1).required() })).min(1).required(),
  deliveryLocation: deliverySchema.optional(),
});
const configuredCustomerOrderSchema = Joi.object({
  productType: Joi.string().valid(...PRODUCT_TYPES).required(),
  designAttributes: Joi.object().required(),
  measurementMode: Joi.string().valid("STANDARD", "CUSTOM").required(),
  standardSize: Joi.string().trim().allow("", null),
  measurements: Joi.object().default({}),
  customizations: Joi.object().default({}),
  orderQuantity: Joi.number().integer().min(1).required(),
  materialId: Joi.string().hex().length(24).required(),
  notes: Joi.string().trim().max(1500).allow("", null),
  deliveryLocation: deliverySchema.optional(),
});

const validateCreateOrder = (obj) => Joi.object({
  customer: Joi.string().hex().length(24).required(), employee: Joi.string().hex().length(24).optional(), description: Joi.string().trim().min(3).max(500).required(),
  notes: Joi.string().trim().allow("", null), status: Joi.string().valid(...ORDER_STATUSES).default("PENDING"), expectedFinishDate: Joi.date().optional(), additionalCost: Joi.number().min(0).default(0), deliveryLocation: deliverySchema.optional(),
}).validate(obj);
const validateCustomerOrder = (obj) => Joi.alternatives().try(configuredCustomerOrderSchema, legacyCustomerOrderSchema).validate(obj);
const validateUpdateOrder = (obj) => Joi.object({
  customer: Joi.string().hex().length(24), employee: Joi.string().hex().length(24).allow(null), deliveryEmployee: Joi.string().hex().length(24).allow(null), description: Joi.string().trim().min(3).max(500),
  notes: Joi.string().trim().allow("", null), expectedFinishDate: Joi.date().allow(null), additionalCost: Joi.number().min(0), deliveryLocation: deliverySchema,
}).min(1).validate(obj);
const validateOrderId = (obj) => Joi.object({ id: Joi.string().hex().length(24).required() }).validate(obj);

module.exports = { Order, ORDER_STATUSES, NEXT_STATUS, validateCreateOrder, validateCustomerOrder, validateUpdateOrder, validateOrderId };
