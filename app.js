const express = require("express");
const connectToDb = require("./config/connectToDb");
const { errorHandler, notFound } = require("./middlewares/error");
const { languageMiddleware } = require("./utils/localization");
const cors = require("cors");
const YAML = require("yamljs");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
require("dotenv").config();

connectToDb();
const swaggerDocument = YAML.load(path.join(__dirname, "openapi.yaml"));
const app = express();
app.use(express.json());
app.use(languageMiddleware);
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(cors({ origin: "*" }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/roles", require("./routes/roleRoutes"));
app.use("/api/raw-materials", require("./routes/rawMaterialRoutes"));
app.use(
  "/api/product-configurations",
  require("./routes/productConfigurationRoutes"),
);
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/health", require("./routes/healthRoutes"));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(notFound);
app.use(errorHandler);

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () =>
    console.log(
      `Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`,
    ),
  );
}
