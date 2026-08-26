const mongoose = require("mongoose");
const Joi = require("joi");

const ORDER_STATUSES = ["PENDING", "CUTTING", "SEWING", "PRINTING", "PACKAGING", "STORAGE", "DELIVERY"];
const NEXT_STATUS = {
  PENDING: "CUTTING",
  CUTTING: "SEWING",
  SEWING: "PRINTING",
  PRINTING: "PACKAGING",
  PACKAGING: "STORAGE",
  STORAGE: "DELIVERY",
};

const OrderMaterialSchema = new mongoose.Schema(
  {
    rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: "RawMaterial", required: true },
    nameSnapshot: { type: String, required: true },
    colorSnapshot: { type: String, default: "" },
    quantity: {
      type: Number,
      min: 1,
      required: true,
      validate: { validator: Number.isInteger, message: "Quantity must be an integer" },
    },
    unitPriceSnapshot: { type: Number, min: 0, required: true },
    subtotal: { type: Number, min: 0, required: true },
  },
  { _id: false }
);

const StageCompletionRequestSchema = new mongoose.Schema(
  {
    stage: { type: String, enum: ORDER_STATUSES, required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", required: true },
    requestedAt: { type: Date, default: Date.now, required: true },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true }
);

const OrderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    description: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: "" },
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
    deliveredAt: Date,
    inventoryConsumed: { type: Boolean, default: false },
    stageCompletionRequests: { type: [StageCompletionRequestSchema], default: [] },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);
const deliverySchema = Joi.object({ address: Joi.string().allow(""), city: Joi.string().allow(""), notes: Joi.string().allow("") });

const validateCreateOrder = (obj) =>
  Joi.object({
    customer: Joi.string().hex().length(24).required(),
    employee: Joi.string().hex().length(24).optional(),
    description: Joi.string().trim().min(3).max(500).required(),
    notes: Joi.string().trim().allow(""),
    status: Joi.string().valid(...ORDER_STATUSES).default("PENDING"),
    expectedFinishDate: Joi.date().optional(),
    additionalCost: Joi.number().min(0).default(0),
    deliveryLocation: deliverySchema.optional(),
  }).validate(obj);

const validateCustomerOrder = (obj) =>
  Joi.object({
    description: Joi.string().trim().min(3).max(500).required(),
    notes: Joi.string().trim().min(3).max(1500).required(),
    rawMaterials: Joi.array().items(
      Joi.object({ rawMaterialId: Joi.string().hex().length(24).required(), quantity: Joi.number().integer().min(1).required() })
    ).min(1).required(),
    deliveryLocation: deliverySchema.optional(),
  }).validate(obj);

const validateUpdateOrder = (obj) =>
  Joi.object({
    customer: Joi.string().hex().length(24), employee: Joi.string().hex().length(24).allow(null), description: Joi.string().trim().min(3).max(500),
    notes: Joi.string().trim().allow(""), expectedFinishDate: Joi.date().allow(null), additionalCost: Joi.number().min(0), deliveryLocation: deliverySchema,
  }).min(1).validate(obj);
const validateOrderId = (obj) => Joi.object({ id: Joi.string().hex().length(24).required() }).validate(obj);

module.exports = { Order, ORDER_STATUSES, NEXT_STATUS, validateCreateOrder, validateCustomerOrder, validateUpdateOrder, validateOrderId };
