const mongoose = require("mongoose");

const transactionSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    requestedBy: {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true,
      },
      receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
    requestedOn: { type: Date, default: Date.now }, // Request date
    amount: { type: Number, required: true }, // Amount of payment
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, // Financer who paid
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"], // Status of the payment
      default: "pending",
    },
    paidOn: { type: Date }, // Date of payment
    paymentMethod: {
      type: String,
      enum: ["Bank Transfer", "Cash", "Credit Card", "Other"], // Payment method
    },
    description: { type: String }, // Description of the payment
  },
  { timestamps: true }
);

const transaction = mongoose.model("transaction", transactionSchema);

module.exports = transaction;
