const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: { type: String },
    price: { type: Number },
    maxUsers: { type: Number },
    features: [{ type: String }],
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Plan = mongoose.model("Plan", planSchema);

module.exports = Plan;
