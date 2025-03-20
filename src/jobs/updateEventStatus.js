const cron = require("node-cron");
const moment = require("moment-timezone");
const Event = require("../modules/event/eventModel");
require("dotenv").config();

cron.schedule("* * * * *", async () => {
  const now = moment().tz("Asia/Kolkata");
  const currentDate = now.format("YYYY-MM-DD");
  const currentTime = now.format("HH:mm");

  try {
    //* Update events from "scheduled" to "progress"
    const progressEvents = await Event.updateMany(
      {
        status: "scheduled",
        startDate: currentDate,
        startTime: {
          $lte: moment.utc(`${currentDate}T${currentTime}`).toDate(),
        },
      },
      { status: "progress" },
      { new: true }
    );
    console.log(`Updated ${progressEvents.modifiedCount} events to progress`);

    //* Update events from "progress" to "done"
    const doneEvents = await Event.updateMany(
      {
        status: "progress",
        endDate: currentDate,
        endTime: {
          $lte: moment.utc(`${currentDate}T${currentTime}`).toDate(),
        },
      },
      { status: "done" },
      { new: true }
    );
    console.log(`Updated ${doneEvents.modifiedCount} events to done`);
  } catch (err) {
    console.error("Error updating events:", err);
  }
});
