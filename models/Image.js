const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  imageLink: {
    type: String,
    required: true,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

mongoose.model("Image", imageSchema);
