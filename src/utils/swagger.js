const swaggerJSDoc = require("swagger-jsdoc");

const schema = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Points API",
      version: "1.0.0",
      description: "API for managing points, users, and events",
    },
    servers: [
      {
        url: "/api",
        description: "API base path",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API key for authentication",
        },
      },
      schemas: {
        Point: {
          type: "object",
          properties: {
            pointId: { type: "string" },
            name: { type: "string" },
            creator: { type: "string" },
            imageUrl: { type: "string" },
            guildId: { type: "string", nullable: true },
            createdAt: { type: "number" },
            userCount: { type: "number" },
          },
        },
        Event: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["add", "remove"] },
            userId: { type: "string" },
            pointId: { type: "string" },
            amount: { type: "number" },
            timestamp: { type: "number" },
          },
        },
        User: {
          type: "object",
          properties: {
            userId: { type: "string" },
            name: { type: "string" },
            points: {
              type: "object",
              additionalProperties: { type: "number" },
            },
          },
        },
        Stats: {
          type: "object",
          properties: {
            users: { type: "number" },
            events: { type: "number" },
            points: { type: "number" },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }, { ApiKeyQueryAuth: [] }],
    paths: {
      "/points": {
        get: {
          tags: ["Points"],
          summary: "Get points list",
          parameters: [
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", default: 100 },
            },
            {
              in: "query",
              name: "offset",
              schema: { type: "integer", default: 0 },
            },
            {
              in: "query",
              name: "name",
              schema: { type: "string" },
              description: "Filter points by name",
            },
          ],
          responses: {
            200: {
              description: "List of points",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      total: { type: "number" },
                      points: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Point" },
                      },
                      offset: { type: "number" },
                      limit: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Points"],
          summary: "Create new point",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["pointId", "name", "creator"],
                  properties: {
                    pointId: { type: "string" },
                    name: { type: "string" },
                    creator: { type: "string" },
                    imageUrl: { type: "string" },
                    guildId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Point created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Point" },
                },
              },
            },
          },
        },
      },
      "/points/{pointId}": {
        get: {
          tags: ["Points"],
          summary: "Get point information",
          parameters: [
            {
              in: "path",
              name: "pointId",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Point information",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Point" },
                },
              },
            },
          },
        },
        delete: {
          tags: ["Points"],
          summary: "Delete a point",
          parameters: [
            {
              in: "path",
              name: "pointId",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Point deleted successfully",
            },
          },
        },
      },
      "/points/{pointId}/leaderboard": {
        get: {
          tags: ["Points"],
          summary: "Get point leaderboard",
          parameters: [
            {
              in: "path",
              name: "pointId",
              required: true,
              schema: { type: "string" },
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", default: 50 },
            },
            {
              in: "query",
              name: "offset",
              schema: { type: "integer", default: 0 },
            },
          ],
          responses: {
            200: {
              description: "Point leaderboard",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      total: { type: "number" },
                      leaderboard: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            userId: { type: "string" },
                            points: { type: "number" },
                          },
                        },
                      },
                      offset: { type: "number" },
                      limit: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/events": {
        get: {
          tags: ["Events"],
          summary: "Get events list",
          parameters: [
            {
              in: "query",
              name: "userId",
              schema: { type: "string" },
            },
            {
              in: "query",
              name: "pointId",
              schema: { type: "string" },
            },
            {
              in: "query",
              name: "type",
              schema: { type: "string", enum: ["add", "remove"] },
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", default: 50 },
            },
            {
              in: "query",
              name: "offset",
              schema: { type: "integer", default: 0 },
            },
          ],
          responses: {
            200: {
              description: "List of events",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      total: { type: "number" },
                      events: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Event" },
                      },
                      offset: { type: "number" },
                      limit: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Events"],
          summary: "Create new event(s)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      required: ["userId", "pointId", "amount", "type"],
                      properties: {
                        userId: { type: "string" },
                        pointId: { type: "string" },
                        amount: { type: "number" },
                        type: { type: "string", enum: ["add", "remove"] },
                      },
                    },
                    {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["userId", "pointId", "amount", "type"],
                        properties: {
                          userId: { type: "string" },
                          pointId: { type: "string" },
                          amount: { type: "number" },
                          type: { type: "string", enum: ["add", "remove"] },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          responses: {
            201: {
              description: "Event(s) created",
              content: {
                "application/json": {
                  schema: {
                    oneOf: [
                      { $ref: "#/components/schemas/Event" },
                      {
                        type: "array",
                        items: { $ref: "#/components/schemas/Event" },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "/events/{eventId}": {
        put: {
          tags: ["Events"],
          summary: "Update an event",
          parameters: [
            {
              in: "path",
              name: "eventId",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    amount: { type: "number" },
                    type: { type: "string", enum: ["add", "remove"] },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Event updated successfully",
            },
          },
        },
        delete: {
          tags: ["Events"],
          summary: "Delete an event",
          parameters: [
            {
              in: "path",
              name: "eventId",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Event deleted successfully",
            },
          },
        },
      },
      "/users": {
        get: {
          tags: ["Users"],
          summary: "Get users list",
          parameters: [
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", default: 50 },
            },
            {
              in: "query",
              name: "offset",
              schema: { type: "integer", default: 0 },
            },
          ],
          responses: {
            200: {
              description: "List of users",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Users"],
          summary: "Create new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["userId", "name"],
                  properties: {
                    userId: { type: "string" },
                    name: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "User created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
        },
      },
      "/stats": {
        get: {
          tags: ["Stats"],
          summary: "Get system statistics",
          responses: {
            200: {
              description: "System statistics",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Stats" },
                },
              },
            },
          },
        },
      },
      "/feed": {
        get: {
          tags: ["Events"],
          summary: "Get real-time events feed",
          description: "Server-Sent Events endpoint for real-time updates",
          responses: {
            200: {
              description: "Event stream",
              content: {
                "text/event-stream": {
                  schema: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["event", "stats", "connected"] },
                      data: {
                        oneOf: [{ $ref: "#/components/schemas/Event" }, { $ref: "#/components/schemas/Stats" }],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: "Points", description: "Points management" },
      { name: "Users", description: "Users management" },
      { name: "Events", description: "Events management" },
      { name: "Stats", description: "System statistics" },
    ],
  },
};

const specs = swaggerJSDoc({
  swaggerDefinition: schema.definition,
  apis: [], // We don't need this since we're defining everything in the schema
});

module.exports = specs;
