const express = require("express");
const userController = require("../user/userController");
const expenseController = require("./expenseController");
const expenseRoute = express.Router();

expenseRoute.post("/", expenseController.createExpense);
expenseRoute.get("/:id", expenseController.getExpense);

module.exports = expenseRoute; 