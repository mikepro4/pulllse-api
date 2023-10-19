const mongoose = require("mongoose");
const Followers = mongoose.model("Followers");
const Subscribers = mongoose.model("Subscribers");
const Subscriptions = mongoose.model("Subscriptions");
const User = mongoose.model("User");
const Following = mongoose.model("Following");
const Notifications = mongoose.model("Notifications");

async function enhanceUserData(
  userId,
  subscriberDataArray,
  loggedInUserRecords,
  subscriberRecords
) {
  loggedInUserRecords = loggedInUserRecords || [];
  subscriberRecords = subscriberRecords.subscriptions || [];

  return await Promise.all(
    subscriberDataArray.map(async (subscriberData) => {
      let isFollowing = loggedInUserRecords.includes(
        subscriberData.subscriber._id
      );

      let subscription = subscriberRecords.find(
        (sub) =>
          String(sub.subscribee) === String(subscriberData.subscriber._id)
      );

      let isSubscribed = subscription ? subscription.status : "not_subscribed";

      return {
        _id: subscriberData.subscriber._id,
        email: subscriberData.subscriber.email,
        userName: subscriberData.subscriber.userName,
        imageLink: subscriberData.subscriber.imageLink,
        isFollowing,
        isSubscribed,
      };
    })
  );
}

async function enhanceSubscribingUserData(
  userId,
  subscribingDataArray,
  loggedInUserRecords,
  subscriberRecords
) {
  loggedInUserRecords = loggedInUserRecords || [];
  subscriberRecords = subscriberRecords.subscriptions || [];

  return await Promise.all(
    subscribingDataArray.map(async (subscribingData) => {
      let isFollowing = loggedInUserRecords.includes(
        subscribingData.subscribee._id
      );

      let subscription = subscriberRecords.find(
        (sub) =>
          String(sub.subscribee) === String(subscribingData.subscribee._id)
      );

      let isSubscribed = subscription ? subscription.status : "not_subscribed";

      return {
        _id: subscribingData.subscribee._id,
        email: subscribingData.subscribee.email,
        userName: subscribingData.subscribee.userName,
        imageLink: subscribingData.subscribee.imageLink,
        isFollowing,
        isSubscribed,
      };
    })
  );
}

module.exports = (app) => {
  app.get("/fetchSubscribers", async (req, res) => {
    try {
      const userId = req.query.userId;
      const loggedInUserId = req.query.loggedInUserId;

      // Check if user ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID." });
      }

      // Fetch the subscribers of the user
      const subscribersData = await Subscribers.findOne({
        user: userId,
      })
        .populate({
          path: "subscribers.subscriber",
          model: "User",
          select: "userName email imageLink",
        })
        .exec();
      console.log(subscribersData.subscribers);
      const loggedInUserFollowingRecord =
        (await Following.findOne({ user: loggedInUserId })) || {};
      const subscriberRecord =
        (await Subscriptions.findOne({ user: loggedInUserId })) || {};

      // Check if userSubscribersRecord exists
      if (!subscribersData) {
        return res.status(404).json({ message: "Subscribers list not found." });
      }

      const enhancedSubscribersData = await enhanceUserData(
        userId,
        subscribersData.subscribers,
        loggedInUserFollowingRecord.following,
        subscriberRecord
      );

      res.json(enhancedSubscribersData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
    }
  });
  app.get("/fetchSubscribing", async (req, res) => {
    try {
      const userId = req.query.userId;
      const loggedInUserId = req.query.loggedInUserId;

      // Fetch the subscribing data of the user
      const subscribingData = await Subscriptions.findOne({
        user: userId,
      })
        .populate({
          path: "subscriptions.subscribee",
          model: "User",
          select: "userName email imageLink",
        })
        .exec();
      subscribingData.subscriptions = subscribingData.subscriptions.filter(
        (subscription) => subscription.status !== "pending"
      );

      const loggedInUserFollowingRecord =
        (await Following.findOne({ user: loggedInUserId })) || {};
      const subscriberRecord =
        (await Subscriptions.findOne({ user: loggedInUserId })) || {};

      // Check if subscribingData exists
      if (!subscribingData) {
        return res.status(404).json({ message: "Subscribing list not found." });
      }

      const enhancedSubscribingData = await enhanceSubscribingUserData(
        userId,
        subscribingData.subscriptions,
        loggedInUserFollowingRecord.following,
        subscriberRecord
      );

      res.json(enhancedSubscribingData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
    }
  });

  app.post("/declineSubscription", async (req, res) => {
    try {
      const { userId, subscriberId, postId } = req.body;

      // Updating the Subscribers collection
      let subscriberRecord = await Subscribers.findOne({ user: userId });
      if (subscriberRecord) {
        const subscription = subscriberRecord.subscribers.find(
          (sub) => sub.subscriber.toString() === subscriberId
        );
        if (subscription) {
          subscription.status = "declined";
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
          subscription.status = "declined";
          await subscriptionRecord.save();
        }
      }

      // Updating the seen property of the Notification
      let notificationRecord = await Notifications.findOne({ _id: postId });
      if (notificationRecord) {
        notificationRecord.seen = true;
        await notificationRecord.save();
      }

      res.status(200).json({ message: "Subscription declined" });
    } catch (error) {
      console.error("Error declining subscription:", error);
      res.status(500).send("Server Error");
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
      const user2 = await User.findById(subscriberId);
      if (user2) {
        user2.subscriptionsCount += 1;
        await user2.save();
      }

      res.status(200).json({ message: "Subscription accepted" });
    } catch (error) {
      console.error("Error accepting subscription:", error);
      res.status(500).send("Server Error");
    }
  });

  app.post("/unsubscribeUser", async (req, res) => {
    try {
      const { userId, subscriberId } = req.body;
      console.log("userId", userId);
      console.log("subscriberId", subscriberId);

      // Updating the Subscribers collection of the user being unsubscribed from
      await Subscribers.updateOne(
        { user: userId },
        { $pull: { subscribers: { subscriber: subscriberId } } }
      );

      // Updating the Subscriptions collection of the unsubscribing user
      await Subscriptions.updateOne(
        { user: subscriberId },
        { $pull: { subscriptions: { subscribee: userId } } }
      );

      // Optionally, you can also delete related notifications
      await Notifications.deleteMany({
        to: userId,
        from: subscriberId,
        type: "subscription_request",
      });

      // Optionally, decrement the subscribersCount in the User model of the unsubscribed user
      await User.updateOne({ _id: userId }, { $inc: { subscribersCount: -1 } });
      await User.updateOne(
        { _id: subscriberId },
        { $inc: { subscriptionsCount: -1 } }
      );

      res.status(200).json({ message: "Unsubscribed successfully" });
    } catch (error) {
      console.error("Error unsubscribing from user:", error);
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
