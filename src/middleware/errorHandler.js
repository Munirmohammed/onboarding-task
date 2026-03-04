const logger = require("../config/logger");

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  logger.error({ message: err.message, stack: err.stack, path: req.path });

  // Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({ message: err.details[0].message });
  }

  // Prisma unique constraint
  if (err.code === "P2002") {
    const field = err.meta?.target?.[0] ?? "field";
    return res.status(409).json({ message: `${field} already exists` });
  }

  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    message: err.message || "Internal server error",
  });
};