const express = require("express");
const { getProductConfigurationsCtrl } = require("../controllers/productConfigurationControllers");
const { verifyToken } = require("../middlewares/verifyToken");

const router = express.Router();
router.get("/", verifyToken, getProductConfigurationsCtrl);
module.exports = router;
