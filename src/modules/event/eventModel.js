const mongoose = require("mongoose");

const eventSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    eventName: { type: String },
    days: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
    startTime: { type: Date },
    endTime: { type: Date },
    description: { type: String },
    location: { type: String },
    staffs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      default: "scheduled",
      enum: ["scheduled", "progress", "done", "cancelled"],
    },
    type: {
      type: String,
      enum: ["User", "Admin"],
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "type",
    },
  },
  { timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
