const express = require("express");
const userController = require("../controllers/userController");
const authVerify = require("../middlewares/authVerify");

const userRoute = express.Router();

// Public Routes
userRoute.post("/send-otp", userController.sendOtp);
userRoute.post("/verify", userController.verifyUser);
userRoute.post("/mpin", userController.mpinHandler);
userRoute.get("/verified/:phone", userController.checkVerified);

// Protected Routes (Require Authentication)
userRoute.use(authVerify);

userRoute.post("/expense", userController.createExpense);
userRoute.post("/report", userController.createReport);
userRoute.get("/list", userController.listController);

userRoute.get("/expense/:id", userController.getExpense);
userRoute.get("/report/:id", userController.getReport);
userRoute.get("/category", userController.getCategory);

userRoute.put("/change-mpin", userController.changeMpin);
userRoute.post("/report-problem", userController.reportProblem);

userRoute.post("/event", userController.createEvent);
userRoute.put("/event/:id", userController.updateEvent);

userRoute.get("/wallet-used", userController.getWalletUsed);
userRoute.get("/approval/:id", userController.getApproval);
userRoute.put("/approval/:id/:action", userController.updateApproval);

userRoute.get("/finance/:id", userController.getFinance);
userRoute.put("/reimburse/:id", userController.reimburseReport);

userRoute.get("/image-analysis", userController.imageAnalysis);

userRoute.get("/advance-payment/:id", userController.viewtransactionById);
userRoute.get("/wallet", userController.getWallet);
userRoute.get("/policy", userController.getPolicy);

userRoute.post("/location", userController.saveLocation);


module.exports = userRoute;
