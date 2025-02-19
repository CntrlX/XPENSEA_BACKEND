const mongoose = require("mongoose");

const superAdminSchema = mongoose.Schema(
  {
    name: { type: String },
    email: { type: String },
    mobile: { type: String },
    password: { type: String },
  },
  { timestamps: true }
);

const superAdmin = mongoose.model("Superadmin", superAdminSchema);

module.exports = superAdmin;
