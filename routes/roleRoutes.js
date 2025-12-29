const express = require("express");
const router = express.Router();

const {
  getAllRolesCtrl,
  getRoleByIdCtrl,
  createRoleCtrl,
  updateRoleCtrl,
  deleteRoleCtrl,
} = require("../controllers/roleControllers");

const {
  verifyToken,
  verifyTokenAndAdmin,
} = require("../middlewares/verifyToken");

// /api/roles
router
  .route("/")
  .get(getAllRolesCtrl)
  .post(verifyTokenAndAdmin, createRoleCtrl);

// /api/roles/:id
router
  .route("/:id")
  .get(verifyTokenAndAdmin, getRoleByIdCtrl)
  .put(verifyTokenAndAdmin, updateRoleCtrl)
  .delete(verifyTokenAndAdmin, deleteRoleCtrl);

module.exports = router;
