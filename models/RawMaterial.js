const mongoose = require("mongoose");
const Joi = require("joi");

const RAW_MATERIAL_CATEGORIES = ["FABRIC", "THREAD", "ACCESSORY", "OTHER"];
const RAW_MATERIAL_UNITS = ["PIECE", "METER", "KILOGRAM", "ROLL", "UNIT"];

const RawMaterialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: RAW_MATERIAL_CATEGORIES, required: true },
    color: { type: String, trim: true, default: "" },
    unit: { type: String, enum: RAW_MATERIAL_UNITS, default: "PIECE" },
    stockQuantity: { type: Number, min: 0, default: 0 },
    reservedQuantity: { type: Number, min: 0, default: 0 },
    unitPrice: { type: Number, min: 0, required: true },
    minimumStock: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RawMaterialSchema.virtual("availableQuantity").get(function () {
  return Math.max(0, this.stockQuantity - this.reservedQuantity);
});

RawMaterialSchema.set("toJSON", { virtuals: true });
RawMaterialSchema.set("toObject", { virtuals: true });

const RawMaterial = mongoose.model("RawMaterial", RawMaterialSchema);

const validateCreateRawMaterial = (obj) =>
  Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    category: Joi.string().valid(...RAW_MATERIAL_CATEGORIES).required(),
    color: Joi.string().trim().allow("", null),
    unit: Joi.string().valid(...RAW_MATERIAL_UNITS).default("PIECE"),
    stockQuantity: Joi.number().min(0).default(0),
    reservedQuantity: Joi.number().min(0).default(0),
    unitPrice: Joi.number().min(0).required(),
    minimumStock: Joi.number().min(0).default(0),
    isActive: Joi.boolean().default(true),
  }).validate(obj);

const validateUpdateRawMaterial = (obj) =>
  Joi.object({
    name: Joi.string().trim().min(2).max(100),
    category: Joi.string().valid(...RAW_MATERIAL_CATEGORIES),
    color: Joi.string().trim().allow("", null),
    unit: Joi.string().valid(...RAW_MATERIAL_UNITS),
    stockQuantity: Joi.number().min(0),
    reservedQuantity: Joi.number().min(0),
    unitPrice: Joi.number().min(0),
    minimumStock: Joi.number().min(0),
    isActive: Joi.boolean(),
  }).min(1).validate(obj);

module.exports = {
  RawMaterial,
  RAW_MATERIAL_CATEGORIES,
  RAW_MATERIAL_UNITS,
  validateCreateRawMaterial,
  validateUpdateRawMaterial,
};
