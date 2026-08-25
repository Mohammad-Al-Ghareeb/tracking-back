const express = require("express");
const router = express.Router();
const { getAllRolesCtrl, getRoleByIdCtrl, createRoleCtrl, updateRoleCtrl, deleteRoleCtrl } = require("../controllers/roleControllers");
const { verifyTokenAndAdmin } = require("../middlewares/verifyToken");
router.route("/").get(verifyTokenAndAdmin, getAllRolesCtrl).post(verifyTokenAndAdmin, createRoleCtrl);
router.route("/:id").get(verifyTokenAndAdmin, getRoleByIdCtrl).put(verifyTokenAndAdmin, updateRoleCtrl).delete(verifyTokenAndAdmin, deleteRoleCtrl);
module.exports = router;
