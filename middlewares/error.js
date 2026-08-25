const notFound = (req, res, next) => {
  res.status(404);
  const error = new Error(req.t ? req.t("common.routeNotFound") : "Route not found");
  error.statusCode = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  const message = statusCode >= 500 && process.env.NODE_ENV === "production" ? (req.t ? req.t("common.serverError") : "An unexpected server error occurred") : err.message;
  res.status(statusCode).json({ message, stack: process.env.NODE_ENV === "production" ? null : err.stack });
};

module.exports = { errorHandler, notFound };
