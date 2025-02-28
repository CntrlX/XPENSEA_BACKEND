const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    admin_name: { type: String, trim: true },
    otp: {
      type: String,
      select: false
    },
    otpExpiry: {
      type: Date,
      select: false
    },
    isVerified: {
      type: Boolean,
      default: false
    },
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


companySchema.index({ email: 1 });

const Company = mongoose.model("Company", companySchema);

module.exports = Company;
