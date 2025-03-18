const express = require("express");
const userController = require("../../controllers/userController");
const reportRoute = express.Router();

reportRoute.post("/", userController.createReport);
reportRoute.get("/:id", userController.getReport);
reportRoute.put("/:id", userController.updateReport);

module.exports = reportRoute; 