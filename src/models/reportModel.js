const mongoose = require("mongoose");

const reportModel = mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    reportId: { type: String },
    title: { type: String },
    reportDate: { type: Date },
    description: { type: String },
    expenses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Expense",
      },
    ],
    status: {
      type: String,
      default: "pending",
      enum: ["drafted", "pending", "accepted", "reimbursed", "rejected"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["event", "other"],
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    location: { type: String },
    reason: [{ type: String }],
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "approverModel",
    },
    approverModel: {
      type: String,
      enum: ["User", "Admin"],
    },
    reimburser: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "reimburserModel",
    },
    reimburserModel: {
      type: String,
      enum: ["User", "Admin"],
    },
    descriptionFinance: { type: String },
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportModel);

module.exports = Report;
