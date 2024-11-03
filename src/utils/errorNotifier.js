const TelegramBot = require("node-telegram-bot-api");

// Configuration
const getConfig = () => ({
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  NODE_ENV: process.env.NODE_ENV,
});

// Known error types that we don't need to notify about
const EXPECTED_ERRORS = {
  ValidationError: true,
  AuthenticationError: true,
  NotFoundError: true,
  BadRequestError: true,
};

// Pure function to determine if error is unexpected
const isUnexpectedError = (error) => {
  if (error.status >= 400 && error.status < 500) return false;
  if (EXPECTED_ERRORS[error.name]) return false;
  return true;
};

// Pure function to format critical error message
const formatErrorMessage = (error, req = {}) => {
  const timestamp = new Date().toISOString();
  const environment = getConfig().NODE_ENV;

  return `
🚨 <b>Critical Error Alert</b>

<b>Environment:</b> ${environment}
<b>Timestamp:</b> ${timestamp}
<b>Error Type:</b> ${error.name}
<b>Message:</b> ${error.message}
${req.method ? `<b>Method:</b> ${req.method}` : ""}
${req.url ? `<b>URL:</b> ${req.originalUrl || req.url}` : ""}
${req.headers?.["user-agent"] ? `<b>User Agent:</b> ${req.headers["user-agent"]}` : ""}
  `.trim();
};

// Telegram notification sender
const sendTelegramAlert = async (message) => {
  const config = getConfig();
  const bot = config.TELEGRAM_BOT_TOKEN ? new TelegramBot(config.TELEGRAM_BOT_TOKEN) : null;

  if (!bot || !config.TELEGRAM_CHAT_ID) return null;

  try {
    return await bot.sendMessage(config.TELEGRAM_CHAT_ID, message, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error("Failed to send Telegram notification:", err);
    return null;
  }
};

// Main notification handler
const notifyIfUnexpected = async (error, req = {}) => {
  //if (!isUnexpectedError(error)) return;

  const message = formatErrorMessage(error, req);
  await sendTelegramAlert(message);
};

// Express error middleware
const errorMiddleware = (err, req, res, next) => {
  // Add more detailed logging
  console.error("Error Details:", {
    name: err.name,
    message: err.message,
    stack: err.stack,
    status: err.status,
  });

  // Handle async errors
  if (err instanceof Error) {
    notifyIfUnexpected(err, req).catch((notifyError) => {
      console.error("Error sending notification:", notifyError);
    });

    // Send appropriate response
    const status = err.status || 500;
    const response = {
      error: {
        message: status === 500 && process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
        code: err.code || err.name,
      },
    };

    return res.status(status).json(response);
  }

  // Pass to next error handler if not an Error instance
  return next(err);
};

module.exports = {
  notifyIfUnexpected,
  errorMiddleware,
};
