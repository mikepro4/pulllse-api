const mongoose = require("mongoose");

const audioSchema = new mongoose.Schema({
  duration: {
    type: Number,
  },
  audioLink: {
    type: String,
    required: true,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  bpm: {
    type: Number,
    default: null,
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

mongoose.model("Audio", audioSchema);
