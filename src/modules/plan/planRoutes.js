const express = require("express");
const planController = require("./planController");
const planRoute = express.Router();

planRoute.post("/", planController.createPlan);

planRoute
  .route("/:id")
  .get(planController.getPlanById)
  .put(planController.updatePlan)
  .delete(planController.deletePlan);

module.exports = planRoute; 