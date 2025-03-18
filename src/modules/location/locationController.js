const responseHandler = require("../helpers/responseHandler");
const Location = require("../models/locationModel");

exports.saveLocation = async (req, res) => {
  try {
    const { eventName, eventId, location } = req.body;

    if (!eventName || !location) {
      return responseHandler(res, 400, "Event name and location are required");
    }

    // Assuming req.userId represents the user making the request
    const locationData = await Location.create({
      eventName,
      eventId: eventId || null, // Optional event ID
      location,
      user: req.userId,
      timeRecorded: Date.now(), // Explicitly recording the time
    });

    return responseHandler(res, 200, "Location saved successfully");
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
}; 