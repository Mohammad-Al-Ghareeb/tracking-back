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
const {
  getAllUsersCtrl,
  getUserByIdCtrl,
  updateUserCtrl,
  deleteUserCtrl,
} = require("../controllers/userControllers");

// /api/roles
router.route("/").get( getAllUsersCtrl);
// .post(verifyTokenAndAdmin, createRoleCtrl);

// /api/roles/:id
router
  .route("/:id")
  .get(verifyTokenAndAdmin, getUserByIdCtrl)
  .put(verifyTokenAndAdmin, updateUserCtrl)
  .delete(verifyTokenAndAdmin, deleteUserCtrl);

module.exports = router;
