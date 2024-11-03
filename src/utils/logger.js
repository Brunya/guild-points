const winston = require("winston");
const { format } = winston;

// Create Winston logger instance
const logger = winston.createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    // Log to file
    new winston.transports.File({ filename: "../logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "../logs/combined.log" }),
  ],
});

// Request logger middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log when the request completes
  res.on("finish", () => {
    const duration = Date.now() - startTime;

    logger.info("Request processed", {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      body: req.body,
      query: req.query,
      params: req.params,
    });
  });

  next();
};

module.exports = {
  logger,
  requestLogger,
};
