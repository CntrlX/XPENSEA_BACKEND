if (process.env.NODE_ENV !== "production") {
  require("dotenv").config(); // Load local .env only if not in productions
}

const express = require("express");
const cors = require("cors");
const volleyball = require("volleyball");
const clc = require("cli-color");
const responseHandler = require("./src/helpers/responseHandler");
const loadSecrets = require("./src/config/env.config");

const {
  swaggerUi,
  swaggerSpec,
  swaggerOptions,
} = require("./src/swagger/swagger");

const app = express();

app.use(express.static("views"));

app.get("/success", (req, res) => {
  res.sendFile(__dirname + "/views/success.html");
});

app.get("/cancel", (req, res) => {
  res.sendFile(__dirname + "/views/cancel.html");
});

app.use(volleyball);

const NODE_ENV = process.env.NODE_ENV;

//* Function to start the server
const startServer = async () => {
  try {
    // if (NODE_ENV === "production") {
    //   // process.env.GOOGLE_APPLICATION_CREDENTIALS = "gha-creds-3274efd02b687b3a.json";
    //   await loadSecrets();
    //   console.log("Server started", process.env.test)
    // }else{
    //   process.env.GOOGLE_APPLICATION_CREDENTIALS = "C:\\Users\\dicor\\OneDrive\\Desktop\\Acute\\xpensea-988cce69e3c6.json";
    //   await loadSecrets();
    // }
    const { PORT, API_VERSION } = process.env;
    const userRoute = require("./src/routes/user");
    const adminRoute = require("./src/routes/admin");

    //* Define the PORT & API version based on environment variables

    //* Enable Cross-Origin Resource Sharing (CORS) middleware
    app.use(cors());
    //* Parse JSON request bodies
    app.use(express.json());
    //* Set the base path for API routes
    const BASE_PATH = `/api/${API_VERSION}`;
    //* Start the cron job
    require("./src/jobs");

    //* Swagger setup
    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, swaggerOptions)
    );

    //* Configure routes for user API
    app.use(`${BASE_PATH}/admin`, adminRoute);
    app.use(`${BASE_PATH}/user`, userRoute);

    //? Define a route for the API root
    app.get(BASE_PATH, (req, res) => {
      return responseHandler(
        res,
        200,
        "🛡️ Welcome! All endpoints are fortified. Do you possess the master 🗝️?",
        null
      );
    });

    //! Start the server and listen on the specified port from environment variable
    app.listen(PORT, () => {
      const portMessage = clc.redBright(`✓ App is running on port: ${PORT}`);
      const envMessage = clc.yellowBright(
        `✓ Environment: ${NODE_ENV || "development"}`
      );
      //* Import database connection module
      require("./src/helpers/connection");
      console.log(`${portMessage}\n${envMessage}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1); // Exit the application with a non-zero status code
  }
};

//! Start the servers
startServer();
