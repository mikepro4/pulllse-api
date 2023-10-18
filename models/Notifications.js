const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["follow_request", "subscription_request"],
    default: "follow_request",
  },
  seen: {
    type: Boolean,
    default: false,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

mongoose.model("Notifications", notificationSchema);
