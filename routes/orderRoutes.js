const express = require("express");
const {
  createOrderCtrl,
  createMyOrderCtrl,
  updateMyOrderCtrl,
  getMyOrdersCtrl,
  getMyOrderByIdCtrl,
  getAssignedOrdersCtrl,
  getAssignedOrderByIdCtrl,
  requestStageCompletionCtrl,
  getAllOrdersCtrl,
  getOrderByIdCtrl,
  updateOrderCtrl,
  assignOrderCtrl,
  updateOrderStatusCtrl,
  approveStageCompletionCtrl,
  rejectStageCompletionCtrl,
  deleteOrderCtrl,
} = require("../controllers/orderControllers");
const { verifyToken, verifyTokenAndAdmin, verifyTokenAndEmployee } = require("../middlewares/verifyToken");

const router = express.Router();

router.route("/my").get(verifyToken, getMyOrdersCtrl).post(verifyToken, createMyOrderCtrl);
router.route("/my/:id").get(verifyToken, getMyOrderByIdCtrl).put(verifyToken, updateMyOrderCtrl);
router.get("/assigned", verifyTokenAndEmployee, getAssignedOrdersCtrl);
router.get("/assigned/:id", verifyTokenAndEmployee, getAssignedOrderByIdCtrl);
router.post("/assigned/:id/stage-completion", verifyTokenAndEmployee, requestStageCompletionCtrl);
router.route("/").post(verifyTokenAndAdmin, createOrderCtrl).get(verifyTokenAndAdmin, getAllOrdersCtrl);
router.patch("/:id/assignment", verifyTokenAndAdmin, assignOrderCtrl);
router.patch("/:id/status", verifyTokenAndAdmin, updateOrderStatusCtrl);
router.patch("/:id/stage-completion/:requestId/approve", verifyTokenAndAdmin, approveStageCompletionCtrl);
router.patch("/:id/stage-completion/:requestId/reject", verifyTokenAndAdmin, rejectStageCompletionCtrl);
router.route("/:id").get(verifyTokenAndAdmin, getOrderByIdCtrl).delete(verifyTokenAndAdmin, deleteOrderCtrl).put(verifyTokenAndAdmin, updateOrderCtrl);

module.exports = router;
