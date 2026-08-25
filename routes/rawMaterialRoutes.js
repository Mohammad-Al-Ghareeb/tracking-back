const express = require("express");
const {
  getAllRawMaterialsCtrl,
  getAvailableRawMaterialsCtrl,
  getRawMaterialByIdCtrl,
  createRawMaterialCtrl,
  updateRawMaterialCtrl,
  deleteRawMaterialCtrl,
} = require("../controllers/rawMaterialControllers");
const { verifyToken, verifyTokenAndAdmin } = require("../middlewares/verifyToken");

const router = express.Router();

router.get("/available", verifyToken, getAvailableRawMaterialsCtrl);
router.route("/").get(verifyTokenAndAdmin, getAllRawMaterialsCtrl).post(verifyTokenAndAdmin, createRawMaterialCtrl);
router
  .route("/:id")
  .get(verifyTokenAndAdmin, getRawMaterialByIdCtrl)
  .put(verifyTokenAndAdmin, updateRawMaterialCtrl)
  .delete(verifyTokenAndAdmin, deleteRawMaterialCtrl);

module.exports = router;
