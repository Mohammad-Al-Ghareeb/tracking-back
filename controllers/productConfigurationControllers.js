const asyncHandler = require("express-async-handler");
const { PRODUCT_CONFIGURATIONS } = require("../config/productConfigurations");

exports.getProductConfigurationsCtrl = asyncHandler(async (req, res) => {
  res.status(200).json({ items: Object.values(PRODUCT_CONFIGURATIONS) });
});
