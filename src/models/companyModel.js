const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    ownerEmail: {
      type: String,
      trim: true,
    },
    industry: { type: String, trim: true },
    address: { type: String, trim: true },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Company = mongoose.model("Company", companySchema);

module.exports = Company;
