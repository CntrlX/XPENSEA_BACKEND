const mongoose = require("mongoose");

const adminSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    name: { type: String },
    designation: { type: String },
    email: { type: String },
    mobile: { type: String },
    password: { type: String },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
    status: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

adminSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
