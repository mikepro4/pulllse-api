const mongoose = require("mongoose");
const Followers = mongoose.model("Followers");
const Subscribers = mongoose.model("Subscribers");
const Subscriptions = mongoose.model("Subscriptions");
const User = mongoose.model("User");
const Following = mongoose.model("Following");
const Notifications = mongoose.model("Notifications");

module.exports = (app) => {
  app.get("/fetchSubscribers", async (req, res) => {
    try {
      const userId = req.query.userId;

      // Check if user ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID." });
      }

      // Fetch the subscribers of the user
      const userSubscribersRecord = await Subscribers.findOne({
        user: userId,
      })
        .populate({
          path: "subscribers.subscriber",
          select: "userName email imageLink",
        })
        .exec();

      // Check if userSubscribersRecord exists
      if (!userSubscribersRecord) {
        return res.status(404).json({ message: "Subscribers list not found." });
      }

      // Fetch the subscribers that the logged-in user has subscribed to
      const loggedInUserSubscriptionsRecord = await Subscribers.findOne({
        user: userId,
      });

      // Send the modified subscribers data as response
      res.json(modifiedSubscribersData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
    }
  });

  app.post("/acceptSubscription", async (req, res) => {
    try {
      const { userId, subscriberId, postId } = req.body;

      // Updating the Subscribers collection
      let subscriberRecord = await Subscribers.findOne({ user: userId });
      if (subscriberRecord) {
        const subscription = subscriberRecord.subscribers.find(
          (sub) => sub.subscriber.toString() === subscriberId
        );
        if (subscription) {
          subscription.status = "accepted";
          await subscriberRecord.save();
        }
      }

      // Updating the Subscriptions collection
      let subscriptionRecord = await Subscriptions.findOne({
        user: subscriberId,
      });
      if (subscriptionRecord) {
        const subscription = subscriptionRecord.subscriptions.find(
          (sub) => sub.subscribee.toString() === userId
        );
        if (subscription) {
          subscription.status = "accepted";
          await subscriptionRecord.save();
        }
      }

      //update notification seen prop
      let notificationRecord = await Notifications.findOne({ _id: postId });
      if (notificationRecord) {
        notificationRecord.seen = true;
        await notificationRecord.save();
      }

      // Incrementing the subscribersCount in the User model
      const user = await User.findById(userId);
      if (user) {
        user.subscribersCount += 1;
        await user.save();
      }

      res.status(200).json({ message: "Subscription accepted" });
    } catch (error) {
      console.error("Error accepting subscription:", error);
      res.status(500).send("Server Error");
    }
  });

  app.post("/subscribeUser", async (req, res) => {
    try {
      const { userId, subscriberId } = req.body;

      // Updating the Subscribers collection
      let subscriberRecord = await Subscribers.findOne({ user: userId });
      if (!subscriberRecord) {
        subscriberRecord = new Subscribers({ user: userId });
      }
      subscriberRecord.subscribers.push({
        subscriber: subscriberId,
        status: "pending",
      });
      await subscriberRecord.save();

      // Updating the Subscriptions collection
      let subscriptionRecord = await Subscriptions.findOne({
        user: subscriberId,
      });
      if (!subscriptionRecord) {
        subscriptionRecord = new Subscriptions({ user: subscriberId });
      }
      subscriptionRecord.subscriptions.push({
        subscribee: userId,
        status: "pending",
      });
      await subscriptionRecord.save();

      // Creating a new notification
      const notification = new Notifications({
        to: userId,
        from: subscriberId,
        type: "subscription_request",
      });
      await notification.save();

      res.status(200).json({ message: "Subscription request sent" });
    } catch (error) {
      console.error("Error subscribing to user:", error);
      res.status(500).send("Server Error");
    }
  });
};
