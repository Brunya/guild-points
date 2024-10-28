require("dotenv").config();
const express = require("express");
const redis = require("./utils/redis");
const routes = require("./routes");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./utils/swagger");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use("/api", routes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

async function start() {
  await redis.connect();
  app.listen(port, () => {
    console.log(`Point service listening at http://localhost:${port}`);
  });
}

start().catch(console.error);
