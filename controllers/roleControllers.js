const asyncHandler = require("express-async-handler");
const { Role } = require("../models/Role");

/* -----------------------------------------------------------
   GET ALL ROLES
   GET /api/roles
   Access: ADMIN ONLY
------------------------------------------------------------ */
exports.getAllRolesCtrl = asyncHandler(async (req, res) => {
  const roles = await Role.find().sort({ createdAt: -1 });
  res.status(200).json({ roles });
});

/* -----------------------------------------------------------
   GET ROLE BY ID
   GET /api/roles/:id
   Access: ADMIN ONLY
------------------------------------------------------------ */
exports.getRoleByIdCtrl = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role || role.isDeleted)
    return res.status(404).json({ message: "Role not found" });

  res.status(200).json(role);
});

/* -----------------------------------------------------------
   CREATE NEW ROLE
   POST /api/roles
   Access: ADMIN ONLY
------------------------------------------------------------ */
exports.createRoleCtrl = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const exists = await Role.findOne({ name });
  if (exists) return res.status(400).json({ message: "Role already exists" });

  const role = await Role.create({ name, description });

  res.status(201).json({
    message: "Role created successfully",
    role,
  });
});

/* -----------------------------------------------------------
   UPDATE ROLE
   PUT /api/roles/:id
   Access: ADMIN ONLY
------------------------------------------------------------ */
exports.updateRoleCtrl = asyncHandler(async (req, res) => {
  const role = await Role.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true }
  );

  if (!role) return res.status(404).json({ message: "Role not found" });

  res.status(200).json({
    message: "Role updated successfully",
    role,
  });
});

/* -----------------------------------------------------------
   DELETE ROLE (SOFT DELETE)
   DELETE /api/roles/:id
   Access: ADMIN ONLY
------------------------------------------------------------ */
exports.deleteRoleCtrl = asyncHandler(async (req, res) => {
  const role = await Role.findByIdAndDelete(req.params.id);

  if (!role) {
    return res.status(404).json({ message: "Role not found" });
  }

  res.status(200).json({ message: "Role deleted successfully" });
});
