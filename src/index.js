require("dotenv").config();
const express = require("express");
const redis = require("./utils/redis");
const routes = require("./routes");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./utils/swagger");
const cors = require("cors");
const { errorMiddleware, notifyIfUnexpected } = require("./utils/errorNotifier");

// Add this before any other code
require("events").EventEmitter.defaultMaxListeners = 15;

const app = express();
const port = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", routes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Error middleware (must be last)
app.use(errorMiddleware);

// Handle unexpected errors
process.on("uncaughtException", async (error) => {
  console.error("Uncaught Exception:", error);
  await notifyIfUnexpected(error);
  process.exit(1);
});

process.on("unhandledRejection", async (error) => {
  console.error("Unhandled Rejection:", error);
  await notifyIfUnexpected(error);
  process.exit(1);
});

// Start server
const start = async () => {
  try {
    await redis.initialize();
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Startup error:", error);
    await notifyIfUnexpected(error);
    process.exit(1);
  }
};

start();
