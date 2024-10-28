const redis = require("./utils/redis");

// Point operations
const createPoints = async (pointId, name, creator) => {
  await redis.hSet(`point:${pointId}`, { name, creator });
  return { pointId };
};

const getPoints = async () => {
  const keys = await redis.keys("point:*");
  const pointKeys = keys.filter((key) => key.match(/^point:[^:]+$/));

  const pointsData = await Promise.all(
    pointKeys.map(async (key) => {
      const data = await redis.hGetAll(key);
      const pointId = key.split(":")[1];
      return { pointId, ...data };
    })
  );

  return pointsData;
};

const getPointsInfo = async (pointId) => {
  const points = await redis.hGetAll(`point:${pointId}`);
  return points;
};

const addPoints = async (userId, pointId, amount) => {
  const event = {
    type: "add",
    pointId,
    amount,
    timestamp: Date.now(),
  };

  await Promise.all([
    redis.hIncrBy(`user:${userId}:points`, pointId, amount),
    redis.zIncrBy(`point:${pointId}:leaderboard`, amount, userId),
    redis.lPush(`user:${userId}:events`, JSON.stringify(event)),
    redis.lPush(`point:${pointId}:events`, JSON.stringify({ ...event, userId })),
  ]);
};

const removePoints = async (userId, pointId, amount) => {
  const event = {
    type: "remove",
    pointId,
    amount,
    timestamp: Date.now(),
  };

  await Promise.all([
    redis.hIncrBy(`user:${userId}:points`, pointId, -amount),
    redis.zIncrBy(`point:${pointId}:leaderboard`, -amount, userId),
    redis.lPush(`user:${userId}:events`, JSON.stringify(event)),
    redis.lPush(`point:${pointId}:events`, JSON.stringify({ ...event, userId })),
  ]);
};

const getUsers = async () => {
  const userKeys = await redis.keys("user:*:points");

  const users = await Promise.all(
    userKeys.map(async (key) => {
      const userId = key.split(":")[1];
      const points = await redis.hGetAll(`user:${userId}:points`);
      const userData = await redis.hGetAll(`user:${userId}`);

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

const getUserPoints = async (userId) => {
  const points = await redis.hGetAll(`user:${userId}:points`);
  return { userId, points };
};

const getLeaderboard = async (pointId, limit = 10, order = "desc") => {
  const key = `point:${pointId}:leaderboard`;

  let userIds;
  if (order === "desc") {
    // Using zRangeWithScores with REV option instead of zRevRange
    userIds = await redis.zRangeWithScores(key, 0, limit - 1, { REV: true });
  } else {
    userIds = await redis.zRangeWithScores(key, 0, limit - 1);
  }

  // Transform the returned array of objects into our desired format
  const leaderboard = userIds.map(({ value: userId, score }) => ({
    userId,
    points: parseInt(score),
  }));

  return leaderboard;
};

// New functions to get events
const getUserEvents = async (userId, limit = 50) => {
  const events = await redis.lRange(`user:${userId}:events`, 0, limit - 1);
  return events.map((event) => JSON.parse(event));
};

const getPointEvents = async (pointId, limit = 50) => {
  const events = await redis.lRange(`point:${pointId}:events`, 0, limit - 1);
  return events.map((event) => JSON.parse(event));
};

module.exports = {
  createPoints,
  getPointsInfo,
  getPoints,
  getUsers,
  addPoints,
  removePoints,
  getLeaderboard,
  getUserPoints,
  getUserEvents,
  getPointEvents,
};
