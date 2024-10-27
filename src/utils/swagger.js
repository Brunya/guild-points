const swaggerJSDoc = require("swagger-jsdoc");
const YAML = require("yamljs");

const swaggerDocument = YAML.load("./src/swagger.yaml");

const options = {
  swaggerDefinition: swaggerDocument,
  apis: ["./src/routes/*.js"],
};

const specs = swaggerJSDoc(options);

module.exports = specs;
