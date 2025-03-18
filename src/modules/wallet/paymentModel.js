const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    gatewayId: { type: String },
    amount: { type: Number },
    currency: { type: String },
    receipt: { type: String },
    status: { type: String },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
