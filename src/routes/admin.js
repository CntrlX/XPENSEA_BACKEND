const express = require("express");
const adminController = require("../controllers/adminController");
const authVerify = require("../middlewares/authVerify");
const adminRoute = express.Router();

adminRoute.post("/login", adminController.loginAdmin);
adminRoute.get("/plan", adminController.getPlans);

adminRoute.use(authVerify);

adminRoute
  .route("/")
  .post(adminController.createAdmin)
  .patch(adminController.changePassword)
  .get(adminController.getAdmin);

adminRoute
  .route("/admin/:id")
  .put(adminController.editAdmin)
  .get(adminController.getAdminById)
  .delete(adminController.deleteAdmin);

adminRoute.route("/role").post(adminController.createRole);

adminRoute
  .route("/role/:id")
  .put(adminController.editRole)
  .get(adminController.getRole)
  .delete(adminController.deleteRole);

adminRoute.get("/list", adminController.listController);

adminRoute.post("/tier", adminController.createTier);

adminRoute
  .route("/tier/:id")
  .put(adminController.editTier)
  .get(adminController.getTier)
  .delete(adminController.deleteTier);

adminRoute.post("/user", adminController.createUser);

adminRoute
  .route("/user/:id")
  .put(adminController.editUser)
  .get(adminController.getUser)
  .delete(adminController.deleteUser);

adminRoute.post("/event", adminController.createEvent);

adminRoute
  .route("/event/:id")
  .get(adminController.getEvent)
  .put(adminController.editEvent)
  .delete(adminController.deleteEvent);

adminRoute.get("/approval/:id", adminController.getApproval);
adminRoute.put("/approval/:id/:action", adminController.updateApproval);
adminRoute.get("/user/reports/:id", adminController.getUserReports);
adminRoute.put("/reimburse/:id", adminController.reimburseReport);
adminRoute.get("/users/filtered", adminController.getFilteredUsers);
adminRoute.get("/finance/:id", adminController.getFinance);

adminRoute.post("/transaction", adminController.createtransaction);
adminRoute.get("/transaction", adminController.viewTransactionsAndDeductions);
adminRoute.get("/transaction/:id", adminController.viewtransactionById);
adminRoute.put("/transaction/:id", adminController.transactionMarkCompleted);

adminRoute.post("/policy", adminController.createPolicy);
adminRoute.get("/policy/:id", adminController.viewPolicyById);
adminRoute.put("/policy/:id", adminController.updatePolicy);

adminRoute.get("/wallet/:id", adminController.getWallet);
adminRoute.get("/approvers", adminController.getApprovers);
adminRoute.get("/dashboard", adminController.getDashboard);
adminRoute.post("/deduct", adminController.deductWallet);

// Plan Routes
adminRoute.route("/plan").post(adminController.createPlan);

adminRoute
  .route("/plan/:id")
  .get(adminController.getPlanById)
  .put(adminController.updatePlan)
  .delete(adminController.deletePlan);

module.exports = adminRoute;
