const mongoose = require("mongoose");

const policySchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
  },
  policyTitle: {
    type: String,
    required: true,
  },
  tier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tier",
    required: true,
  },
  userType: {
    type: String,
    required: false,
  },
  activationDate: {
    type: Date,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  policyDetails: {
    type: String,
  },
  accuracy: {
    type: String,
    required: true,
  },
  authenticity: {
    type: String,
    required: true,
  },
  compliance: {
    type: String,
    required: true,
  },
  relevance: {
    type: String,
    required: true,
  },
  completeness: {
    type: String,
    required: true,
  },
});

const Policy = mongoose.model("Policy", policySchema);

module.exports = Policy;
