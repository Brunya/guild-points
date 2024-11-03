const services = require("./services");
const { EventEmitter } = require("events");

// Create a singleton event emitter instance
const eventEmitter = new EventEmitter();

// Controller factory to handle common try-catch patterns
const controllerWrapper = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (error) {
    next(error); // Pass error to Express error handling middleware
  }
};

// Points Controllers
const pointsController = {
  getPoints: controllerWrapper(async (req, res) => {
    const { limit = 100, offset = 0, name } = req.query;
    const points = await services.getPoints(limit, offset, { name });
    res.json(points);
  }),

  createPoint: controllerWrapper(async (req, res) => {
    const { pointId, name, creator, imageUrl, guildId } = req.body;
    const result = await services.createPoints(pointId, name, creator, imageUrl, guildId);
    res.status(201).json(result);
  }),

  getPointInfo: controllerWrapper(async (req, res) => {
    const { pointId } = req.params;
    const point = await services.getPointsInfo(pointId);
    if (!point) return res.status(404).json({ error: "Point not found" });
    res.json(point);
  }),

  getPointLeaderboard: controllerWrapper(async (req, res) => {
    const { pointId } = req.params;
    const { limit = 100, offset = 0, order = "desc" } = req.query;
    const leaderboard = await services.getLeaderboard(pointId, parseInt(limit), parseInt(offset), order.toLowerCase());
    res.json(leaderboard);
  }),

  getPointEvents: controllerWrapper(async (req, res) => {
    const { pointId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    const events = await services.getEvents({
      pointId,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json(events);
  }),

  deletePoint: controllerWrapper(async (req, res) => {
    const { pointId } = req.params;
    const result = await services.deletePoint(pointId);
    if (!result) return res.status(404).json({ error: "Point not found" });
    res.status(204).send();
  }),
};

// Users Controllers
const usersController = {
  getUsers: controllerWrapper(async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    const users = await services.getUsers(limit, offset);
    res.json(users);
  }),

  createUser: controllerWrapper(async (req, res) => {
    const { userId, name, email } = req.body;
    const result = await services.createUser(userId, name, email);
    res.status(201).json(result);
  }),

  getUserPoints: controllerWrapper(async (req, res) => {
    const { userId } = req.params;
    const points = await services.getUserPoints(userId);
    res.json(points);
  }),

  getUserEvents: controllerWrapper(async (req, res) => {
    const { userId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    const events = await services.getEvents({ userId, limit, offset });
    res.json(events);
  }),
};

// Events Controllers
const eventsController = {
  getEvents: controllerWrapper(async (req, res) => {
    const { pointId } = req.params;
    const { userId, type, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const events = await services.getEvents({
      userId,
      pointId,
      type,
      startDate: startDate ? new Date(startDate).getTime() : null,
      endDate: endDate ? new Date(endDate).getTime() : null,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json(events);
  }),

  createEvent: controllerWrapper(async (req, res) => {
    const handleSingleEvent = async (eventData) => {
      const result = await services.addEvent(eventData.userId, eventData.pointId, eventData.amount, eventData.type);
      eventEmitter.emit("newEvent", { type: "event", data: result });
      return result;
    };

    if (Array.isArray(req.body)) {
      const results = await Promise.all(req.body.map(handleSingleEvent));
      res.status(201).json(results);
    } else {
      const result = await handleSingleEvent(req.body);
      res.status(201).json(result);
    }
  }),

  updateEvent: controllerWrapper(async (req, res) => {
    const { eventId } = req.params;
    const { userId, pointId, amount, type } = req.body;
    const result = await services.updateEvent(eventId, userId, pointId, amount, type);
    res.json(result);
  }),

  deleteEvent: controllerWrapper(async (req, res) => {
    const { eventId } = req.params;
    const result = await services.removeEvent(eventId);
    if (!result) return res.status(404).json({ success: false, message: "Event not found" });
    res.status(204).send();
  }),

  handleEventsFeed: controllerWrapper(async (req, res) => {
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

    const sendSSE = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    // Send initial data
    const initialStats = await services.getStats();
    sendSSE({ type: "stats", data: initialStats });
    sendSSE({ type: "connected" });

    // Handle new events
    const handleNewEvent = async (event) => {
      sendSSE(event);
      const stats = await services.getStats();
      sendSSE({ type: "stats", data: stats });
    };

    eventEmitter.on("newEvent", handleNewEvent);
    req.on("close", () => eventEmitter.removeListener("newEvent", handleNewEvent));
  }),
};

// Stats Controllers
const statsController = {
  getStats: controllerWrapper(async (req, res) => {
    const stats = await services.getStats();
    res.json(stats);
  }),
};

module.exports = {
  ...pointsController,
  ...usersController,
  ...eventsController,
  ...statsController,
};
