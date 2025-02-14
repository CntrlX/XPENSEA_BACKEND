const mongoose = require("mongoose");

const roleSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    roleName: { type: String },
    permissions: [{ type: String }],
    locationAccess: [{ type: String }],
    description: { type: String },
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Role = mongoose.model("Role", roleSchema);

module.exports = Role;
