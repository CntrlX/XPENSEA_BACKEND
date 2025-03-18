const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    responses: [
      {
        admin: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Admin",
        },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
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

ticketSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto delete after 30 days

const Ticket = mongoose.model("Ticket", ticketSchema);

module.exports = Ticket;
