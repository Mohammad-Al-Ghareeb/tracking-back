const express = require("express");
const { getExpensesCtrl, createExpenseCtrl, updateExpenseCtrl, deleteExpenseCtrl } = require("../controllers/expenseControllers");
const { verifyTokenAndAdmin } = require("../middlewares/verifyToken");
const router = express.Router();
router.route("/").get(verifyTokenAndAdmin, getExpensesCtrl).post(verifyTokenAndAdmin, createExpenseCtrl);
router.route("/:id").put(verifyTokenAndAdmin, updateExpenseCtrl).delete(verifyTokenAndAdmin, deleteExpenseCtrl);
module.exports = router;
