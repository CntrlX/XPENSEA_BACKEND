const express = require("express");
const superAdminController = require("../controllers/superAdminController");
const superAdminRoute = express.Router();
const authVerify = require("../middlewares/authVerifySuperAdmin");

superAdminRoute.route("/login").post(superAdminController.superAdminLogin);

superAdminRoute.use(authVerify);
superAdminRoute
  .route("/createadmin")
  .post(superAdminController.createCompanyAdmin);
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
