const express = require("express");
const policyController = require("./policyController");
const policyRoute = express.Router();

policyRoute.post("/", policyController.createPolicy);
policyRoute.get("/:id", policyController.viewPolicyById);
policyRoute.put("/:id", policyController.updatePolicy);

module.exports = policyRoute; 