const mongoose = require("mongoose");

const deductionSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    amount: { type: Number },
    status: {
      type: Boolean,
      default: true,
    },
    deductBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    deductOn: { type: Date },
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
    },
    mode: {
      type: String,
      enum: ["wallet", "bank"],
    },
  },
  { timestamps: true }
);

const Deduction = mongoose.model("Deduction", deductionSchema);

module.exports = Deduction;
