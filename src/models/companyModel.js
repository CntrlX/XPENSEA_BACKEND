const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    admin_name: { type: String, trim: true },
    email: {
      type: String,
      trim: true,
    },
    industry: { type: String, trim: true },
    company_size: { type: String, trim: true },
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
