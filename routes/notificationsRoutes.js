const mongoose = require("mongoose");
const Followers = mongoose.model("Followers");
const Subscribers = mongoose.model("Subscribers");
const User = mongoose.model("User");
const Following = mongoose.model("Following");
const Notifications = mongoose.model("Notifications");

module.exports = (app) => {
  app.get("/fetchNotifications", async (req, res) => {
    try {
      const userId = req.query.userId;
      console.log(userId);

      // Fetch notifications where the logged-in user is the receiver and the notification has not been seen
      const notifications = await Notifications.find({
        to: userId,
        seen: false, // Adding condition to find notifications where 'seen' is false
      })
        .populate("from", "userName email imageLink")
        .sort({ date: -1 }) // Sorting notifications to get the latest first
        .exec();

      res.json(notifications);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
    }
  });
};
