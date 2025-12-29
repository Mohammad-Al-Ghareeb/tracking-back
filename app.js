const express = require("express");
const connectToDb = require("./config/connectToDb");
const { errorHandler, notFound } = require("./middlewares/error");
const cors = require("cors");
const YAML = require("yamljs");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
require("dotenv").config();

// Connection To Db
connectToDb();
const swaggerDocument = YAML.load(path.join(__dirname, "openapi.yaml"));

// Init App
const app = express();

// Middlewares
app.use(express.json());

// Cors Policy
app.use(
  cors({
    origin: "*",
  })
);

// socket.io

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/roles", require("./routes/roleRoutes"));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(notFound);
app.use(errorHandler);

// Running The Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>
  console.log(
    `Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`
  )
);
