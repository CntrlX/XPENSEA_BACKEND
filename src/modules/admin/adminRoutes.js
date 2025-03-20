const express = require("express");
const adminController = require("./adminController");
const authVerify = require("../../middlewares/authVerify");
const adminRoute = express.Router();

adminRoute.post("/login", adminController.loginAdmin);

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



//todo admin list
// adminRoute.get("/list", adminController.listController);



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





adminRoute.get("/wallet/:id", adminController.getWallet);
adminRoute.get("/approvers", adminController.getApprovers);
adminRoute.get("/dashboard", adminController.getDashboard);
adminRoute.post("/deduct", adminController.deductWallet);




module.exports = adminRoute;
