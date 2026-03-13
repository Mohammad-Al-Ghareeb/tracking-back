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
  getAllBriefUsers,
} = require("../controllers/userControllers");

// /api/roles
router.route("/").get(getAllUsersCtrl);
// .post(verifyTokenAndAdmin, createRoleCtrl);

router.get("/brief", getAllBriefUsers);

// /api/roles/:id
router
  .route("/:id")
  .get(getUserByIdCtrl)
  .put(updateUserCtrl)
  .delete(deleteUserCtrl);

module.exports = router;
