const express = require("express");
const tierController = require("./tierController");
const tierRoute = express.Router();

tierRoute.post("/", tierController.createTier);

tierRoute
  .route("/:id")
  .put(tierController.editTier)
  .get(tierController.getTier)
  .delete(tierController.deleteTier);

module.exports = tierRoute; 