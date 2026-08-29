const asyncHandler = require("express-async-handler");
const { RawMaterial, validateCreateRawMaterial, validateUpdateRawMaterial } = require("../models/RawMaterial");
const { localizeJoiError } = require("../utils/localization");

const parseColors = (value) => {
  const rawColors = String(value || "").split(/[,،]/).map((color) => color.trim()).filter(Boolean);
  const uniqueColors = [...new Map(rawColors.map((color) => [color.toLocaleLowerCase(), color])).values()];
  return uniqueColors.length > 0 ? uniqueColors : [""];
};

exports.getAllRawMaterialsCtrl = asyncHandler(async (req, res) => {
  const { page = 1, perPage = 20, category, availability } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (availability === "available") filter.$expr = { $gt: [{ $subtract: ["$stockQuantity", "$reservedQuantity"] }, 0] };
  if (availability === "unavailable") filter.$expr = { $lte: [{ $subtract: ["$stockQuantity", "$reservedQuantity"] }, 0] };
  const items = await RawMaterial.find(filter).sort({ createdAt: -1 }).skip((Number(page) - 1) * Number(perPage)).limit(Number(perPage));
  const documentCount = await RawMaterial.countDocuments(filter);
  res.status(200).json({ items, pagination: { page: Number(page), perPage: Number(perPage), count: items.length, documentCount } });
});

exports.getAvailableRawMaterialsCtrl = asyncHandler(async (req, res) => {
  const items = await RawMaterial.find({ $expr: { $gt: [{ $subtract: ["$stockQuantity", "$reservedQuantity"] }, 0] } }).sort({ name: 1, color: 1 });
  res.status(200).json({ items });
});

exports.getRawMaterialByIdCtrl = asyncHandler(async (req, res) => {
  const item = await RawMaterial.findById(req.params.id);
  if (!item) return res.status(404).json({ message: req.t("raw.notFound") });
  res.status(200).json(item);
});

exports.createRawMaterialCtrl = asyncHandler(async (req, res) => {
  const { error } = validateCreateRawMaterial(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });
  const colors = parseColors(req.body.color);
  const items = await RawMaterial.insertMany(colors.map((color) => ({ ...req.body, color })));
  const createdItems = items.map((item) => item.toJSON());
  res.status(201).json({ ...createdItems[0], createdItems, createdCount: createdItems.length });
});

exports.updateRawMaterialCtrl = asyncHandler(async (req, res) => {
  const { error } = validateUpdateRawMaterial(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });
  const item = await RawMaterial.findById(req.params.id);
  if (!item) return res.status(404).json({ message: req.t("raw.notFound") });
  const nextReserved = req.body.reservedQuantity ?? item.reservedQuantity;
  const nextStock = req.body.stockQuantity ?? item.stockQuantity;
  if (nextReserved > nextStock) return res.status(400).json({ message: req.t("raw.reservedExceedsStock") });

  const colors = req.body.color !== undefined ? parseColors(req.body.color) : [item.color || ""];
  const common = { ...req.body };
  delete common.color;
  Object.assign(item, common, { color: colors[0] });
  await item.save();

  const createdItems = [];
  for (const color of colors.slice(1)) {
    const duplicate = await RawMaterial.findOne({ _id: { $ne: item._id }, name: item.name, category: item.category, color: new RegExp(`^${escapeRegex(color)}$`, "i") });
    if (duplicate) continue;
    const created = await RawMaterial.create({
      name: item.name, category: item.category, color, unit: item.unit,
      stockQuantity: item.stockQuantity, reservedQuantity: 0, unitPrice: item.unitPrice, minimumStock: item.minimumStock,
    });
    createdItems.push(created.toJSON());
  }
  res.status(200).json({ ...item.toJSON(), createdItems, createdCount: createdItems.length });
});

exports.deleteRawMaterialCtrl = asyncHandler(async (req, res) => {
  const item = await RawMaterial.findById(req.params.id);
  if (!item) return res.status(404).json({ message: req.t("raw.notFound") });
  if (item.reservedQuantity > 0) return res.status(409).json({ message: req.t("raw.deleteBlocked") });
  await item.deleteOne();
  res.status(200).json({ message: req.t("raw.deleted") });
});

function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
