const { createClient } = require("redis");

const redis = createClient({
  url: process.env.NODE_ENV === "development" ? process.env.LOCAL_REDIS_URL : process.env.REDIS_STACK_URL,
  modules: {
    json: {},
    search: {},
  },
  scripts: true,
  commandsQueueing: true,
});

redis.on("error", (err) => console.log("Redis Client Error", err));

redis.initialize = async () => {
  try {
    await redis.connect();

    // Drop existing points index if it exists
    const pointsIndexInfo = await redis.ft.info("idx:points").catch(() => null);
    if (pointsIndexInfo) {
      console.log("Dropping existing points index...");
      await redis.sendCommand(["FT.DROPINDEX", "idx:points"]);
    }

    // Create points index
    console.log("Creating points index...");
    await redis.sendCommand([
      "FT.CREATE",
      "idx:points",
      "ON",
      "JSON",
      "PREFIX",
      "1",
      "point:",
      "SCHEMA",
      "$.name",
      "AS",
      "name",
      "TEXT",
      "SORTABLE",
      "$.creator",
      "AS",
      "creator",
      "TEXT",
      "SORTABLE",
      "$.guildId",
      "AS",
      "guildId",
      "TAG",
      "SORTABLE",
      "$.createdAt",
      "AS",
      "createdAt",
      "NUMERIC",
      "SORTABLE",
      "$.userCount",
      "AS",
      "userCount",
      "NUMERIC",
    ]);
    console.log("Points index created successfully");

    // Drop existing events index if it exists
    const eventsIndexInfo = await redis.ft.info("idx:events").catch(() => null);
    if (eventsIndexInfo) {
      console.log("Dropping existing events index...");
      await redis.sendCommand(["FT.DROPINDEX", "idx:events"]);
    }

    // Create events index
    console.log("Creating events index...");
    await redis.sendCommand([
      "FT.CREATE",
      "idx:events",
      "ON",
      "JSON",
      "PREFIX",
      "1",
      "event:",
      "SCHEMA",
      "$.id",
      "AS",
      "id",
      "TAG",
      "$.type",
      "AS",
      "type",
      "TAG",
      "$.userId",
      "AS",
      "userId",
      "TAG",
      "$.pointId",
      "AS",
      "pointId",
      "TAG",
      "$.amount",
      "AS",
      "amount",
      "NUMERIC",
      "$.timestamp",
      "AS",
      "timestamp",
      "NUMERIC",
    ]);
    console.log("Events index created successfully");
  } catch (error) {
    console.error("Error initializing Redis:", error);
    throw error;
  }
};

module.exports = redis;
