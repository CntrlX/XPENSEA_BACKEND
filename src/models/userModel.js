const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    employeeId: { type: String },
    name: { type: String },
    email: { type: String },
    mobile: { type: String },
    image: { type: String },
    otp: { type: Number },
    mpin: { type: String },
    designation: { type: String },
    userType: {
      type: String,
      enum: ["submitter", "approver"],
    },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: Boolean,
      default: false,
    },
    tier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tier",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    location: { type: String },
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

userSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

const User = mongoose.model("User", userSchema);

module.exports = User;
