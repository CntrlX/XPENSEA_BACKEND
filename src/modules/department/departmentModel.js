const mongoose = require("mongoose");

const departmentSchema = mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
    },
    departmentName: { 
      type: String 
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    departmentManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    departmentThresholdManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    status: {
      type: Boolean,
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

const Department = mongoose.model("Department", departmentSchema);

module.exports = Department;
