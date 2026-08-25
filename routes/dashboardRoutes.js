const express = require("express");
const { getFinanceCtrl, getMonthlyStatsCtrl, getSummaryCtrl } = require("../controllers/dashboardControllers");
const { verifyTokenAndAdmin } = require("../middlewares/verifyToken");
const router = express.Router();
router.get("/finance", verifyTokenAndAdmin, getFinanceCtrl);
router.get("/monthly-stats", verifyTokenAndAdmin, getMonthlyStatsCtrl);
router.get("/summary", verifyTokenAndAdmin, getSummaryCtrl);
module.exports = router;
