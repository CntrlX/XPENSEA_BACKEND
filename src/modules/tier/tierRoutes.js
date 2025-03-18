const express = require("express");
const adminController = require("../../controllers/adminController");
const tierRoute = express.Router();

tierRoute.post("/", adminController.createTier);

tierRoute
  .route("/:id")
  .put(adminController.editTier)
  .get(adminController.getTier)
  .delete(adminController.deleteTier);

module.exports = tierRoute; 