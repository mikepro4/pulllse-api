const mongoose = require("mongoose");

const feedSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  pulse: { type: mongoose.Schema.Types.ObjectId, ref: "Pulse", required: true },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  targetUsers: [],
});

mongoose.model("Feed", feedSchema);
