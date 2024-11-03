const createAuthMiddleware = () => {
  return (req, res, next) => {
    const headerApiKey = req.headers["x-api-key"];
    const queryApiKey = req.query["x-api-key"];
    const apiKey = headerApiKey || queryApiKey;

    if (!apiKey) {
      return res.status(401).json({
        error: "Authentication failed",
        details: "API key is missing",
      });
    }

    const isValidApiKey = process.env.API_KEY === apiKey;

    if (!isValidApiKey) {
      return res.status(401).json({
        error: "Authentication failed",
        details: "Invalid API key provided",
      });
    }

    next();
  };
};

module.exports = createAuthMiddleware;
