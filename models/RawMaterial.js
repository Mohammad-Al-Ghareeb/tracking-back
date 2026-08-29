const mongoose = require("mongoose");
const Joi = require("joi");

const RAW_MATERIAL_CATEGORIES = ["FABRIC", "THREAD", "ACCESSORY"];
const RAW_MATERIAL_UNITS = ["PIECE", "METER", "KILOGRAM", "ROLL", "UNIT"];
const RAW_MATERIAL_NAME_NO_DIGITS_PATTERN = /^[^0-9٠-٩۰-۹]+$/;

const RawMaterialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, validate: { validator: (value) => RAW_MATERIAL_NAME_NO_DIGITS_PATTERN.test(value), message: "Raw material name cannot contain numbers" } },
    category: { type: String, enum: RAW_MATERIAL_CATEGORIES, required: true },
    color: { type: String, trim: true, default: "" },
    unit: { type: String, enum: RAW_MATERIAL_UNITS, default: "PIECE" },
    stockQuantity: { type: Number, min: 0, default: 0 },
    reservedQuantity: { type: Number, min: 0, default: 0 },
    unitPrice: { type: Number, min: 0, required: true },
    minimumStock: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

RawMaterialSchema.virtual("availableQuantity").get(function () { return Math.max(0, this.stockQuantity - this.reservedQuantity); });
RawMaterialSchema.virtual("availability").get(function () { return this.stockQuantity - this.reservedQuantity > 0 ? "AVAILABLE" : "UNAVAILABLE"; });
RawMaterialSchema.set("toJSON", { virtuals: true });
RawMaterialSchema.set("toObject", { virtuals: true });

const RawMaterial = mongoose.model("RawMaterial", RawMaterialSchema);

const createFields = {
  name: Joi.string().trim().min(2).max(100).pattern(RAW_MATERIAL_NAME_NO_DIGITS_PATTERN).required(),
  category: Joi.string().valid(...RAW_MATERIAL_CATEGORIES).required(),
  color: Joi.string().trim().allow("", null),
  unit: Joi.string().valid(...RAW_MATERIAL_UNITS).default("PIECE"),
  stockQuantity: Joi.number().min(0).default(0),
  reservedQuantity: Joi.number().min(0).default(0),
  unitPrice: Joi.number().min(0).required(),
  minimumStock: Joi.number().min(0).default(0),
};

const validateCreateRawMaterial = (obj) => Joi.object(createFields).validate(obj);
const validateUpdateRawMaterial = (obj) => Joi.object({
  name: Joi.string().trim().min(2).max(100).pattern(RAW_MATERIAL_NAME_NO_DIGITS_PATTERN),
  category: Joi.string().valid(...RAW_MATERIAL_CATEGORIES),
  color: Joi.string().trim().allow("", null),
  unit: Joi.string().valid(...RAW_MATERIAL_UNITS),
  stockQuantity: Joi.number().min(0),
  reservedQuantity: Joi.number().min(0),
  unitPrice: Joi.number().min(0),
  minimumStock: Joi.number().min(0),
}).min(1).validate(obj);

module.exports = { RawMaterial, RAW_MATERIAL_CATEGORIES, RAW_MATERIAL_UNITS, validateCreateRawMaterial, validateUpdateRawMaterial };
