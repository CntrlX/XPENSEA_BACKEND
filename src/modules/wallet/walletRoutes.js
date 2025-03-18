const express = require("express");
const walletController = require("./walletController");
const walletRoute = express.Router();

walletRoute.get("/:id", walletController.getWallet);
walletRoute.post("/deduct", walletController.deductWallet);

walletRoute.get("/used", walletController.getWalletUsed);

module.exports = walletRoute; 