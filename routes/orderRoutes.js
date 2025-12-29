const express = require("express");
const {
  createOrderCtrl,
  getAllOrdersCtrl,
  getOrderByIdCtrl,
  updateOrderCtrl,
  deleteOrderCtrl,
} = require("../controllers/orderControllers");

const {
  verifyToken,
  verifyTokenAndAdmin,
} = require("../middlewares/verifyToken");

const router = express.Router();

router
  .route("/")
  .post(verifyToken, createOrderCtrl)
  .get(verifyToken, getAllOrdersCtrl);

router
  .route("/:id")
  .get(verifyToken, getOrderByIdCtrl)
  .delete(verifyTokenAndAdmin, deleteOrderCtrl)
  .put(verifyToken, updateOrderCtrl);

module.exports = router;
