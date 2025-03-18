const express = require("express");
const transactionController = require("./transactionController");
const transactionRoute = express.Router();

// Admin Transaction Routes
transactionRoute.post("/", transactionController.createtransaction);
transactionRoute.get("/", transactionController.viewTransactionsAndDeductions);
transactionRoute.get("/:id", transactionController.viewtransactionById);
transactionRoute.put("/:id", transactionController.transactionMarkCompleted);

// User Transaction Routes
transactionRoute.post("/advance-payment", transactionController.createtransaction);
transactionRoute.get("/advance-payment/:id", transactionController.viewtransactionById);

module.exports = transactionRoute; 