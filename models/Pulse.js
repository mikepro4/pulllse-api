const mongoose = require("mongoose");

const pulseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    audio: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Audio",
    },
    dateCreated: {
        type: Date,
        default: Date.now,
    },
    name: {
        type: String,
        default: "Pulse",
        required: true,
    },
});

mongoose.model("Pulse", pulseSchema);
