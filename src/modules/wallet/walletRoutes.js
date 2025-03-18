const express = require("express");
const adminController = require("../../controllers/adminController");
const userController = require("../../controllers/userController");
const walletRoute = express.Router();

walletRoute.get("/:id", adminController.getWallet);
walletRoute.post("/deduct", adminController.deductWallet);

walletRoute.get("/used", userController.getWalletUsed);
walletRoute.get("/", userController.getWallet);

module.exports = walletRoute; 