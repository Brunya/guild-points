const createValidationMiddleware = (schemas) => {
  return (req, res, next) => {
    const validationErrors = [];

    // Validate each property specified in schemas
    Object.keys(schemas).forEach((key) => {
      const schema = schemas[key];
      const value = req[key];

      const { error } = schema.validate(value, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        validationErrors.push(
          ...error.details.map((detail) => ({
            field: `${key}.${detail.path.join(".")}`,
            message: detail.message,
          }))
        );
      }
    });

    if (validationErrors.length === 0) return next();

    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: validationErrors,
    });
  };
};

module.exports = createValidationMiddleware;
