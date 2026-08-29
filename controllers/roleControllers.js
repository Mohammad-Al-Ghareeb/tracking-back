const asyncHandler = require("express-async-handler");
const { Role, validateCreateRole, validateUpdateRole } = require("../models/Role");
const { localizeJoiError } = require("../utils/localization");

exports.getAllRolesCtrl = asyncHandler(async (req, res) => { const roles = await Role.find().sort({ createdAt: -1 }); res.status(200).json({ roles }); });
exports.getRoleByIdCtrl = asyncHandler(async (req, res) => { const role = await Role.findById(req.params.id); if (!role) return res.status(404).json({ message: req.t("roles.notFound") }); res.status(200).json(role); });
exports.createRoleCtrl = asyncHandler(async (req, res) => { const { error } = validateCreateRole(req.body); if (error) return res.status(400).json({ message: localizeJoiError(req, error) }); const { name, description, group } = req.body; const exists = await Role.findOne({ name }); if (exists) return res.status(400).json({ message: req.t("roles.exists") }); const role = await Role.create({ name, description, group }); res.status(201).json({ message: req.t("roles.created"), role }); });
exports.updateRoleCtrl = asyncHandler(async (req, res) => { const { error } = validateUpdateRole(req.body); if (error) return res.status(400).json({ message: localizeJoiError(req, error) }); const role = await Role.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }); if (!role) return res.status(404).json({ message: req.t("roles.notFound") }); res.status(200).json({ message: req.t("roles.updated"), role }); });
exports.deleteRoleCtrl = asyncHandler(async (req, res) => { const role = await Role.findByIdAndDelete(req.params.id); if (!role) return res.status(404).json({ message: req.t("roles.notFound") }); res.status(200).json({ message: req.t("roles.deleted") }); });
