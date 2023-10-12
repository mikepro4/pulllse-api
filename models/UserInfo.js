const mongoose = require("mongoose");

const userInfoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  profileImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image",
  },

  userName: {
    type: String,
    required: true,
    unique: true,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  postsCount: {
    type: Number,
    default: 0,
  },
  followersCount: {
    type: Number,
    default: 0,
  },
  subscribersCount: {
    type: Number,
    default: 0,
  },
  followingCount: {
    type: Number,
    default: 0,
  },
  notificationsCount: {
    type: Number,
    default: 0,
  },
});

mongoose.model("UserInfo", userInfoSchema);
