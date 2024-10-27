const express = require("express");
const asyncHandler = require("express-async-handler");
const services = require("./services");
const router = express.Router();

// Point Routes
router.post(
  "/points",
  asyncHandler(async (req, res) => {
    const { pointId, name, creator } = req.body;
    const result = await services.createPoints(pointId, name, creator);
    res.status(201).json(result);
  })
);

router.get(
  "/points/:pointId",
  asyncHandler(async (req, res) => {
    const { pointId } = req.params;
    const point = await services.getPointsInfo(pointId);
    if (!point) return res.status(404).json({ error: "Point not found" });
    res.json(point);
  })
);

router.get(
  "/points/:pointId/events",
  asyncHandler(async (req, res) => {
    const { pointId } = req.params;
    const events = await services.getPointEvents(pointId);
    res.json(events);
  })
);

router.post(
  "/points/:pointId/events",
  asyncHandler(async (req, res) => {
    const { pointId } = req.params;
    const { type, amount, userId } = req.body;
    let result;
    if (type === "add") {
      result = await services.addPoints(userId, pointId, amount);
    } else if (type === "remove") {
      result = await services.removePoints(userId, pointId, amount);
    }
    res.status(201).json(result);
  })
);

router.get(
  "/points/:pointId/leaderboard",
  asyncHandler(async (req, res) => {
    const { pointId } = req.params;
    const { limit = 10 } = req.query;
    const leaderboard = await services.getLeaderboard(pointId, parseInt(limit));
    res.json(leaderboard);
  })
);

// User Routes
router.get(
  "/users/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const points = await services.getUserPoints(userId);
    res.json(points);
  })
);

router.get(
  "/users/:userId/events",
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const events = await services.getUserEvents(userId);
    res.json(events);
  })
);

module.exports = router;
