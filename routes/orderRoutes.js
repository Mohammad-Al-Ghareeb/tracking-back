const express = require("express");
const {
  createOrderCtrl,
  getAllOrdersCtrl,
  getOrderByIdCtrl,
  updateOrderCtrl,
  deleteOrderCtrl,
} = require("../controllers/orderControllers");
const { verifyTokenAndAdmin } = require("../middlewares/verifyToken");

const router = express.Router();

router
  .route("/")
  .post(verifyTokenAndAdmin, createOrderCtrl)
  .get(verifyTokenAndAdmin, getAllOrdersCtrl);

router
  .route("/:id")
  .get(verifyTokenAndAdmin, getOrderByIdCtrl)
  .delete(verifyTokenAndAdmin, deleteOrderCtrl)
  .put(verifyTokenAndAdmin, updateOrderCtrl);

module.exports = router;
