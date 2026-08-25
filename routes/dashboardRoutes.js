const express = require("express");
const { getFinanceCtrl, getSummaryCtrl } = require("../controllers/dashboardControllers");
const { verifyTokenAndAdmin } = require("../middlewares/verifyToken");
const router = express.Router();
router.get("/finance", verifyTokenAndAdmin, getFinanceCtrl);
router.get("/summary", verifyTokenAndAdmin, getSummaryCtrl);
module.exports = router;
