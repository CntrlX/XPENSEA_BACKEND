const mongoose = require("mongoose");

const subSchema = new mongoose.Schema({
  title: {
    type: String,
    set: (v) => v.toLowerCase(),
  },
  maxAmount: { type: Number },
  status: {
    type: Boolean,
    default: false,
  },
});

const tierSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    title: { type: String },
    activationDate: { type: Date },
    categories: [subSchema],
    status: {
      type: Boolean,
      default: true,
    },
    totalAmount: { type: Number },
    level: { type: Number },
  },
  { timestamps: true }
);

const Tier = mongoose.model("Tier", tierSchema);

module.exports = Tier;
