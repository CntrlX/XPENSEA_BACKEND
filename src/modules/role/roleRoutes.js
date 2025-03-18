const express = require("express");
const roleController = require("./roleController");
const roleRoute = express.Router();

roleRoute.route("/").post(roleController.createRole);

roleRoute
  .route("/:id")
  .put(roleController.editRole)
  .get(roleController.getRole)
  .delete(roleController.deleteRole);

module.exports = roleRoute; 