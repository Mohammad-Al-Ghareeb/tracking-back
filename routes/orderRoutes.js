const express = require("express");
const {
  createOrderCtrl,
  createMyOrderCtrl,
  getMyOrdersCtrl,
  getMyOrderByIdCtrl,
  getAllOrdersCtrl,
  getOrderByIdCtrl,
  updateOrderCtrl,
  assignOrderCtrl,
  updateOrderStatusCtrl,
  deleteOrderCtrl,
} = require("../controllers/orderControllers");
const { verifyToken, verifyTokenAndAdmin } = require("../middlewares/verifyToken");

const router = express.Router();

router.route("/my").get(verifyToken, getMyOrdersCtrl).post(verifyToken, createMyOrderCtrl);
router.get("/my/:id", verifyToken, getMyOrderByIdCtrl);
router.route("/").post(verifyTokenAndAdmin, createOrderCtrl).get(verifyTokenAndAdmin, getAllOrdersCtrl);
router.patch("/:id/assignment", verifyTokenAndAdmin, assignOrderCtrl);
router.patch("/:id/status", verifyTokenAndAdmin, updateOrderStatusCtrl);
router.route("/:id").get(verifyTokenAndAdmin, getOrderByIdCtrl).delete(verifyTokenAndAdmin, deleteOrderCtrl).put(verifyTokenAndAdmin, updateOrderCtrl);

module.exports = router;
