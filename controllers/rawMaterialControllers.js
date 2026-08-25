const asyncHandler = require("express-async-handler");
const {
  RawMaterial,
  validateCreateRawMaterial,
  validateUpdateRawMaterial,
} = require("../models/RawMaterial");

exports.getAllRawMaterialsCtrl = asyncHandler(async (req, res) => {
  const { page = 1, perPage = 20, category, isActive } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const items = await RawMaterial.find(filter)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(perPage))
    .limit(Number(perPage));
  const documentCount = await RawMaterial.countDocuments(filter);

  res.status(200).json({
    items,
    pagination: {
      page: Number(page),
      perPage: Number(perPage),
      count: items.length,
      documentCount,
    },
  });
});

exports.getAvailableRawMaterialsCtrl = asyncHandler(async (req, res) => {
  const items = await RawMaterial.find({ isActive: true }).sort({ name: 1, color: 1 });
  res.status(200).json({
    items: items.filter((item) => item.stockQuantity - item.reservedQuantity > 0),
  });
});

exports.getRawMaterialByIdCtrl = asyncHandler(async (req, res) => {
  const item = await RawMaterial.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Raw material not found" });
  res.status(200).json(item);
});

exports.createRawMaterialCtrl = asyncHandler(async (req, res) => {
  const { error } = validateCreateRawMaterial(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const item = await RawMaterial.create(req.body);
  res.status(201).json(item);
});

exports.updateRawMaterialCtrl = asyncHandler(async (req, res) => {
  const { error } = validateUpdateRawMaterial(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const item = await RawMaterial.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Raw material not found" });

  const nextReserved = req.body.reservedQuantity ?? item.reservedQuantity;
  const nextStock = req.body.stockQuantity ?? item.stockQuantity;
  if (nextReserved > nextStock) {
    return res.status(400).json({ message: "Reserved quantity cannot exceed stock quantity" });
  }

  Object.assign(item, req.body);
  await item.save();
  res.status(200).json(item);
});

exports.deleteRawMaterialCtrl = asyncHandler(async (req, res) => {
  const item = await RawMaterial.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Raw material not found" });
  if (item.reservedQuantity > 0) {
    return res.status(409).json({ message: "Raw material has reserved stock and cannot be deleted" });
  }
  await item.deleteOne();
  res.status(200).json({ message: "Raw material deleted successfully" });
});
