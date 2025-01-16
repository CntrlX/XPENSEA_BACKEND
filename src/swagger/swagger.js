const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const { PORT, API_VERSION } = process.env;

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Xpensea API Documentation",
    version: "1.0.0",
    description: "API documentation for Xpensea application",
  },
  servers: [
    {
      url: `https://xpensea-backend-189792861103.us-central1.run.app/api/v1/`,
    },
    {
      url: `https://xpensea--backend-393541516579.asia-south1.run.app/api/v1/`,
    },
    {
      url: `http://localhost:${PORT}/api/${API_VERSION}`,
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ["./src/swagger/paths/*.js"],
};

const swaggerOptions = {
  swaggerOptions: {
    docExpansion: "none",
    filter: true,
    tagsSorter: "alpha",
    operationsSorter: "alpha",
  },
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec, swaggerOptions };
