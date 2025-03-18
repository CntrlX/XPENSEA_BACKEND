const express = require("express");
const userController = require("../../controllers/userController");
const locationRoute = express.Router();

locationRoute.post("/", userController.saveLocation);

module.exports = locationRoute; 