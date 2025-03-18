const express = require("express");
const locationController = require("./locationController");
const locationRoute = express.Router();

locationRoute.post("/", locationController.saveLocation);

module.exports = locationRoute; 