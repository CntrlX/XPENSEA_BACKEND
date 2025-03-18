const express = require("express");
const adminController = require("../../controllers/adminController");
const userController = require("../../controllers/userController");
const transactionRoute = express.Router();

// Admin Transaction Routes
transactionRoute.post("/", adminController.createtransaction);
transactionRoute.get("/", adminController.viewTransactionsAndDeductions);
transactionRoute.get("/:id", adminController.viewtransactionById);
transactionRoute.put("/:id", adminController.transactionMarkCompleted);

// User Transaction Routes
transactionRoute.post("/advance-payment", userController.createtransaction);
transactionRoute.get("/advance-payment/:id", userController.viewtransactionById);

module.exports = transactionRoute; 