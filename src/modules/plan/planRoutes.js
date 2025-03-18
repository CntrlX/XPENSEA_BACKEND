const express = require("express");
const adminController = require("../../controllers/adminController");
const planRoute = express.Router();

planRoute.post("/", adminController.createPlan);

planRoute
  .route("/:id")
  .get(adminController.getPlanById)
  .put(adminController.updatePlan)
  .delete(adminController.deletePlan);

module.exports = planRoute; 