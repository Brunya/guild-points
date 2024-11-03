const redis = require("./utils/redis");
const { v4: uuidv4 } = require("uuid");

// Points Services
const getPoints = async (limit, offset, filters) => {
  try {
    const searchQuery = filters.pointId
      ? `@id:point:${filters.pointId}`
      : filters.name
      ? `@name:(${filters.name})`
      : "*";

    const { total, documents } = await redis.ft.search("idx:points", searchQuery, {
      LIMIT: { from: offset, size: limit },
      SORTBY: { BY: "userCount", DIRECTION: "DESC" },
      RETURN: ["$"],
    });

    const points = documents.map((doc) => {
      const pointData = doc.json ? JSON.parse(doc.json) : Object.assign({}, doc.value);
      const pointId = doc.id.replace("point:", "");
      return {
        pointId,
        ...pointData,
      };
    });

    return { total, points, offset, limit };
  } catch (error) {
    console.error("Error fetching points:", error);
    throw error;
  }
};

const getPointsInfo = async (pointId) => {
  const points = await redis.hGetAll(`point:${pointId}`);
  return points;
};

const createPoints = async (pointId, name, creator, imageUrl, guildId) => {
  try {
    const pointData = {
      name,
      creator,
      imageUrl: imageUrl || "",
      guildId: guildId || null,
      createdAt: Date.now(),
      userCount: 0,
    };

    // Using sendCommand for JSON.SET
    await Promise.all([
      redis.sendCommand(["JSON.SET", `point:${pointId}`, "$", JSON.stringify(pointData)]),
      redis.incr("stats:pointCount"),
    ]);

    return { pointId, ...pointData };
  } catch (error) {
    console.error("Error creating points:", error);
    throw error;
  }
};

const getLeaderboard = async (pointId, limit, offset, order) => {
  const key = `point:${pointId}:leaderboard`;

  // Get total count of users in the leaderboard
  const total = await redis.zCard(key);

  let userIds;
  if (order === "desc") {
    userIds = await redis.zRangeWithScores(key, offset, offset + limit - 1, { REV: true });
  } else {
    userIds = await redis.zRangeWithScores(key, offset, offset + limit - 1);
  }

  const leaderboard = userIds.map(({ value: userId, score }) => ({
    userId,
    points: parseInt(score),
  }));

  return { total, leaderboard, offset, limit };
};

const deletePoint = async (pointId) => {
  const exists = await redis.exists(`point:${pointId}`);
  if (!exists) return false;

  const multi = redis.multi();
  (await redis.keys(`point:${pointId}*`)).forEach((key) => multi.del(key));
  await multi.exec();
  return true;
};

// Users Services
const getUsers = async (limit, offset) => {
  let cursor = 0;
  let userKeys = [];
  let total = 0;

  do {
    const { cursor: nextCursor, keys: batch } = await redis.scan(cursor, {
      MATCH: "user:*:points",
      COUNT: 1000,
    });

    cursor = nextCursor;
    total += batch.length;

    if (total > offset) {
      userKeys = [...userKeys, ...batch];
    }

    if (userKeys.length >= offset + limit) {
      break;
    }
  } while (cursor !== 0);

  const paginatedKeys = userKeys.slice(offset, offset + limit);

  const users = await Promise.all(
    paginatedKeys.map(async (key) => {
      const userId = key.split(":")[1];
      const [userData, points] = await Promise.all([
        redis.hGetAll(`user:${userId}`),
        redis.hGetAll(`user:${userId}:points`),
      ]);

      return {
        userId,
        name: userData.name || userId,
        points: Object.entries(points).reduce(
          (acc, [pointType, amount]) => ({
            ...acc,
            [pointType]: parseInt(amount),
          }),
          {}
        ),
      };
    })
  );

  return users;
};

const createUser = async (userId, name) => {
  await redis.hSet(`user:${userId}`, "name", name, "createdAt", String(Date.now()));
  return { userId, name };
};

const getUserPoints = async (userId) => {
  const points = await redis.hGetAll(`user:${userId}:points`);
  return { userId, points };
};

const getUserEvents = async (userId, limit) => {
  const events = await redis.lRange(`user:${userId}:events`, 0, limit - 1);
  return events.map((event) => JSON.parse(event));
};

// Events Services
const getEvents = async ({ userId, pointId, type, startDate, endDate, limit, offset } = {}) => {
  try {
    // Build array of search parameters
    const searchParams = [];

    if (pointId) {
      searchParams.push(`@pointId:{${pointId}}`);
    }
    if (userId) {
      searchParams.push(`@userId:{${userId}}`);
    }
    if (type) {
      searchParams.push(`@type:{${type}}`);
    }

    // Set query string based on whether we have filters
    const queryString = searchParams.length ? searchParams.join(" ") : "*";

    const result = await redis.ft.search("idx:events", queryString, {
      LIMIT: {
        from: offset,
        size: limit,
      },
      SORTBY: { BY: "timestamp", DIRECTION: "DESC" },
      RETURN: ["$"],
    });

    const events = result.documents.map((doc) => {
      const eventData = doc.json ? JSON.parse(doc.json) : Object.assign({}, doc.value);

      return eventData;
    });

    return {
      total: result.total,
      events,
      offset,
      limit,
    };
  } catch (error) {
    console.error("Error in getEvents:", error);
    throw error;
  }
};

const addEvent = async (userId, pointId, amount, type) => {
  if (!userId || !pointId || !amount || !["add", "remove"].includes(type)) {
    throw new Error("Invalid input parameters");
  }

  const eventId = uuidv4();
  const timestamp = Date.now();

  try {
    const currentPoints = parseInt((await redis.hGet(`user:${userId}:points`, pointId)) || "0");
    const pointAdjustment = type === "add" ? amount : -Math.min(currentPoints, amount);

    const event = Object.freeze({
      id: eventId,
      type,
      userId,
      pointId,
      amount: type === "add" ? amount : Math.min(currentPoints, amount), // Adjust amount if removing more than available
      timestamp,
    });

    const userExists = await redis.exists(`user:${userId}`);
    const hasPoints = await redis.hExists(`user:${userId}:points`, pointId);

    // Separate JSON.SET command
    const jsonSetPromise = redis.sendCommand(["JSON.SET", `event:${eventId}`, "$", JSON.stringify(event)]);

    // Handle other operations with multi
    const multi = redis.multi();
    multi.hIncrBy(`user:${userId}:points`, pointId, pointAdjustment);
    multi.zIncrBy(`point:${pointId}:leaderboard`, pointAdjustment, userId);

    if (!hasPoints && type === "add") {
      // Add JSON.NUMINCRBY to separate promises
      const incrementUserCountPromise = redis.sendCommand(["JSON.NUMINCRBY", `point:${pointId}`, "$.userCount", "1"]);
      await Promise.all([jsonSetPromise, incrementUserCountPromise, multi.exec()]);
    } else {
      await Promise.all([jsonSetPromise, multi.exec()]);
    }

    if (!userExists) {
      await redis.incr("stats:userCount");
    }

    return event;
  } catch (error) {
    console.error("Error adding event:", { error, userId, pointId, eventId });
    throw error;
  }
};

const addBatchEvents = async (events) => {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error("Events must be a non-empty array");
  }

  const processedEvents = [];

  try {
    // Track unique users and points in this batch
    const uniqueUsers = new Set(events.map((event) => event.userId));
    const uniquePoints = new Set(events.map((event) => event.pointId));

    // Check existing users, points, and point existence
    const [userChecks, pointChecks] = await Promise.all([
      Promise.all(
        Array.from(uniqueUsers).map(async (userId) => {
          const [exists, pointsMap] = await Promise.all([
            redis.exists(`user:${userId}`),
            redis.hGetAll(`user:${userId}:points`),
          ]);
          return { userId, exists, pointsMap };
        })
      ),
      Promise.all(
        Array.from(uniquePoints).map(async (pointId) => {
          const exists = await redis.exists(`point:${pointId}`);
          return { pointId, exists };
        })
      ),
    ]);

    const userResults = userChecks;
    const pointResults = new Map(pointChecks.map((p) => [p.pointId, p.exists]));
    const newUserCount = userResults.filter((result) => !result.exists).length;

    // Track points for each user-point combination
    const pointsTracker = new Map(); // {userId-pointId: currentPoints}

    // First pass: get current points for all affected user-point combinations
    for (const event of events) {
      const { userId, pointId } = event;
      const key = `${userId}-${pointId}`;
      if (!pointsTracker.has(key)) {
        const current = parseInt((await redis.hGet(`user:${userId}:points`, pointId)) || "0");
        pointsTracker.set(key, current);
      }
    }

    // Process each event with adjusted amounts
    for (const eventData of events) {
      const { userId, pointId, amount, type } = eventData;
      const key = `${userId}-${pointId}`;
      const currentPoints = pointsTracker.get(key);

      const adjustedAmount = type === "add" ? amount : Math.min(currentPoints, amount);

      const pointAdjustment = type === "add" ? adjustedAmount : -adjustedAmount;

      // Update tracked points
      pointsTracker.set(key, Math.max(0, currentPoints + pointAdjustment));

      const eventId = uuidv4();
      const timestamp = Date.now();
      const event = Object.freeze({
        id: eventId,
        type,
        userId,
        pointId,
        amount: adjustedAmount,
        timestamp,
      });

      const userResult = userResults.find((r) => r.userId === userId);
      const hasPoints = userResult?.pointsMap?.[pointId];

      // Prepare commands
      const jsonSetPromise = redis.sendCommand(["JSON.SET", `event:${eventId}`, "$", JSON.stringify(event)]);

      const multi = redis.multi();
      multi.hIncrBy(`user:${userId}:points`, pointId, pointAdjustment);
      multi.zIncrBy(`point:${pointId}:leaderboard`, pointAdjustment, userId);
      multi.incr("stats:eventCount");

      if (!hasPoints && type === "add") {
        const incrementUserCountPromise = redis.sendCommand(["JSON.NUMINCRBY", `point:${pointId}`, "$.userCount", "1"]);
        await Promise.all([jsonSetPromise, incrementUserCountPromise, multi.exec()]);
      } else {
        await Promise.all([jsonSetPromise, multi.exec()]);
      }

      processedEvents.push(event);
    }

    // Increment stats for new users if any
    if (newUserCount > 0) {
      await redis.incrBy("stats:userCount", newUserCount);
    }

    return processedEvents;
  } catch (error) {
    console.error("Error in addBatchEvents:", error);
    throw new Error(`Batch processing failed: ${error.message}`);
  }
};

const removeEvent = async (eventId) => {
  try {
    // Get event data using JSON.GET
    const eventDataStr = await redis.sendCommand(["JSON.GET", `event:${eventId}`, "$"]);
    if (!eventDataStr) return false;

    console.log("eventDataStr", eventDataStr);

    const event = JSON.parse(eventDataStr);
    const [{ userId, pointId, type, amount }] = event;

    console.log("event", event);

    // Create multi for atomic operations
    const multi = redis.multi();

    // Remove event
    multi.del(`event:${eventId}`);

    // Calculate and adjust points based on event type
    const pointsAdjustment = type === "add" ? -amount : amount;

    // Only adjust points if there's a non-zero adjustment
    if (pointsAdjustment !== 0) {
      // Convert pointsAdjustment to string to ensure compatibility
      const adjustmentStr = pointsAdjustment.toString();
      multi.hIncrBy(`user:${userId}:points`, pointId, adjustmentStr);
      multi.zIncrBy(`point:${pointId}:leaderboard`, adjustmentStr, userId);
    }

    await multi.exec();
    return true;
  } catch (error) {
    console.error("Error removing event:", error);
    throw error;
  }
};

const updateEvent = async (eventId, amount, type) => {
  try {
    // Get original event data using JSON.GET
    const eventData = await redis.sendCommand(["JSON.GET", `event:${eventId}`, "$"]);
    if (!eventData) return false;

    const originalEvent = JSON.parse(eventData);
    const { userId, pointId } = originalEvent;

    // Calculate point adjustments if needed
    if (amount !== undefined || type !== undefined) {
      const oldAmount = parseInt(originalEvent.amount);
      const newAmount = amount !== undefined ? parseInt(amount) : oldAmount;
      const oldType = originalEvent.type;
      const newType = type || oldType;

      const oldPoints = oldType === "add" ? oldAmount : -oldAmount;
      const newPoints = newType === "add" ? newAmount : -newAmount;
      const netAdjustment = newPoints - oldPoints;

      if (netAdjustment !== 0) {
        await Promise.all([
          redis.hIncrBy(`user:${userId}:points`, pointId, netAdjustment),
          redis.zIncrBy(`point:${pointId}:leaderboard`, netAdjustment, userId),
        ]);
      }
    }

    // Update the event using JSON.SET
    const updatedEvent = {
      ...originalEvent,
      ...(amount !== undefined && { amount: parseInt(amount) }),
      ...(type !== undefined && { type }),
      timestamp: Date.now(),
    };

    await redis.sendCommand(["JSON.SET", `event:${eventId}`, "$", JSON.stringify(updatedEvent)]);
    return true;
  } catch (error) {
    console.error("Error updating event:", error);
    return false;
  }
};

// Stats Services
const getStats = async () => {
  try {
    const [userCount, eventCount, pointCount] = await Promise.all([
      redis.get("stats:userCount"),
      redis.get("stats:eventCount"),
      redis.get("stats:pointCount"),
    ]);

    return {
      users: parseInt(userCount || "0"),
      events: parseInt(eventCount || "0"),
      points: parseInt(pointCount || "0"),
    };
  } catch (error) {
    console.error("Error in getStats:", error);
    return { users: 0, events: 0, points: 0 };
  }
};

module.exports = {
  createUser,
  createPoints,
  getPointsInfo,
  getPoints,
  getUsers,
  addEvent,
  getLeaderboard,
  getUserPoints,
  getUserEvents,
  deletePoint,
  removeEvent,
  updateEvent,
  getEvents,
  getStats,
  addBatchEvents,
};
