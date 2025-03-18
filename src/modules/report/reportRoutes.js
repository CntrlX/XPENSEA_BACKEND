const express = require("express");
const reportController = require("./reportController");
const reportRoute = express.Router();

reportRoute.post("/", reportController.createReport);
reportRoute.get("/:id", reportController.getReport);
reportRoute.put("/:id", reportController.updateReport);

module.exports = reportRoute; 