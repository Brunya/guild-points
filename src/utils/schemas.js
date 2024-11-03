const Joi = require("joi");

// Common ID schema
const idSchema = Joi.number();

// Point Schemas
const pointSchemas = {
  create: Joi.object({
    pointId: Joi.number().required(),
    name: Joi.string().required().min(1).max(100),
    creator: Joi.string().required().min(1).max(100),
    imageUrl: Joi.string().uri().allow("").optional(),
    guildId: Joi.number().optional(),
    userCount: Joi.number().optional(),
  }),

  params: Joi.object({
    pointId: idSchema.required(),
  }),
};

// Event Schemas
const eventSchemas = {
  create: Joi.object({
    pointId: idSchema.required(),
    userId: idSchema.required(),
    type: Joi.string().required().valid("add", "remove"),
    amount: Joi.number().required().min(1),
  }),

  update: Joi.object({
    data: Joi.object({
      eventId: idSchema.required(),
      amount: Joi.number().required().min(1),
      type: Joi.string().required().valid("add", "remove"),
    }),
  }),

  params: Joi.object({
    eventId: idSchema.required(),
  }),
};

// API Authentication Schema
const authSchemas = {
  apiKey: Joi.object({
    "x-api-key": Joi.string()
      .required()
      .pattern(/^[A-Za-z0-9-_]{32,64}$/)
      .messages({
        "string.pattern.base": "Invalid API key format",
        "any.required": "API key is required",
      }),
  }).unknown(true), // Allow other headers to pass through
};

module.exports = {
  pointSchemas,
  eventSchemas,
  authSchemas,
};
