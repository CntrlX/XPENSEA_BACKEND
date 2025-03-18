const express = require("express");
const adminController = require("../../controllers/adminController");
const roleRoute = express.Router();

roleRoute.route("/").post(adminController.createRole);

roleRoute
  .route("/:id")
  .put(adminController.editRole)
  .get(adminController.getRole)
  .delete(adminController.deleteRole);

module.exports = roleRoute; 