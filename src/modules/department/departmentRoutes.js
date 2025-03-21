const express = require("express");
const departmentController = require("./departmentController");
const authVerify = require("../../middlewares/authVerify");
const departmentRoute = express.Router();

// Apply authentication middleware to all routes
departmentRoute.use(authVerify);

// Create a new department
departmentRoute.post("/", departmentController.createDepartment);

// Get all departments
departmentRoute.get("/", departmentController.getAllDepartments);

// Department user management
departmentRoute.get("/:departmentId/users", departmentController.getDepartmentUsers);
departmentRoute.post("/:departmentId/users/:userId", departmentController.addUserToDepartment);
departmentRoute.delete("/:departmentId/users/:userId", departmentController.removeUserFromDepartment);

departmentRoute
  .route("/:id")
  .get(departmentController.getDepartmentById)
  .put(departmentController.updateDepartment)
  .delete(departmentController.deleteDepartment);

module.exports = departmentRoute; 