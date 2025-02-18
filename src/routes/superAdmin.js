const express = require("express");
const superAdminController = require("../controllers/superAdminController");
const superAdminRoute = express.Router();

superAdminRoute.get("/companies", superAdminController.getAllCompanies);
superAdminRoute.get(
  "/companies/:companyId",
  superAdminController.getCompanyById
);

superAdminRoute.get("/plans", superAdminController.getAllPlans);
superAdminRoute.get("/plans/:planId", superAdminController.getPlanById);

superAdminRoute.get("/payments", superAdminController.getAllPayments);
superAdminRoute.get(
  "/payments/:companyId",
  superAdminController.getCompanyPayments
);

superAdminRoute.get("/dashboard/stats", superAdminController.getDashboardStats);

module.exports = superAdminRoute;
