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

const { photoUpload } = require("../middlewares/photoUpload");

const router = express.Router();

const uploadOrderFiles = photoUpload.fields([
  { name: "images", maxCount: 10 },
  { name: "employeeSignature", maxCount: 1 },
  { name: "customerSignature", maxCount: 1 },
]);

router
  .route("/")
  .post(verifyToken, uploadOrderFiles, createOrderCtrl)
  .get(getAllOrdersCtrl);

router
  .route("/:id")
  .get(getOrderByIdCtrl)
  .delete(deleteOrderCtrl)
  .put(updateOrderCtrl);

module.exports = router;
