const express = require("express");
const userController = require("../../controllers/userController");
const expenseRoute = express.Router();

expenseRoute.post("/", userController.createExpense);
expenseRoute.get("/:id", userController.getExpense);

module.exports = expenseRoute; 