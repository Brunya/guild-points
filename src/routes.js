const express = require("express");
const asyncHandler = require("express-async-handler");
const controllers = require("./controllers");
const createAuthMiddleware = require("./middleware/auth");
const validate = require("./middleware/validate");
const { pointSchemas, eventSchemas } = require("./utils/schemas");
const { errorMiddleware } = require("./utils/errorNotifier");
// Route group definitions
const createPointRoutes = (router) => {
  router.route("/points").get(asyncHandler(controllers.getPoints)).post(asyncHandler(controllers.createPoint));

  router
    .route("/points/:pointId")
    .get(validate({ params: pointSchemas.params }), asyncHandler(controllers.getPointInfo))
    .delete(validate({ params: pointSchemas.params }), asyncHandler(controllers.deletePoint));

  router.get(
    "/points/:pointId/leaderboard",
    validate({ params: pointSchemas.params }),
    asyncHandler(controllers.getPointLeaderboard)
  );

  router.get("/points/:pointId/events", asyncHandler(controllers.getEvents));
};

const createUserRoutes = (router) => {
  router.route("/users").get(asyncHandler(controllers.getUsers)).post(asyncHandler(controllers.createUser));

  router.route("/users/:userId").get(asyncHandler(controllers.getUserPoints));

  router.get("/users/:userId/events", asyncHandler(controllers.getUserEvents));
};

const createEventRoutes = (router) => {
  router.route("/events").get(asyncHandler(controllers.getEvents)).post(asyncHandler(controllers.createEvent));

  router
    .route("/events/:eventId")
    .put(asyncHandler(controllers.updateEvent))
    .delete(asyncHandler(controllers.deleteEvent));
};

const createMiscRoutes = (router) => {
  router.get("/feed", controllers.handleEventsFeed);
  router.get("/stats", asyncHandler(controllers.getStats));
};

// Router initialization and configuration
const initializeRouter = () => {
  const router = express.Router();

  // Apply auth middleware to all routes
  router.use(createAuthMiddleware());

  // Initialize route groups
  createPointRoutes(router);
  createUserRoutes(router);
  createEventRoutes(router);
  createMiscRoutes(router);

  // Error handling should be last
  router.use((err, req, res, next) => {
    console.log("Router error caught:", err);
    next(err);
  });

  router.use(errorMiddleware);

  return router;
};

module.exports = initializeRouter();
