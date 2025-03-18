const express = require("express");
const adminController = require("../../controllers/adminController");
const policyRoute = express.Router();

policyRoute.post("/", adminController.createPolicy);
policyRoute.get("/:id", adminController.viewPolicyById);
policyRoute.put("/:id", adminController.updatePolicy);

module.exports = policyRoute; 