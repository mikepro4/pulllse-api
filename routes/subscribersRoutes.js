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
      console.log("enhancedSubscribersData", enhancedSubscribersData);
      // Fetch the subscribers that the logged-in user has subscribed to
      //   const subscribersData = await Subscribers.findOne({
      //     user: userId,
      //   });

      // Send the modified subscribers data as response
      res.json(enhancedSubscribersData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
    }
  });

  //    app.get("/fetchFollowers", async (req, res) => {
  //      try {
  //        const loggedInUserId = req.query.loggedInUserId;
  //        const userId = req.query.userId;

  //        const followersData = await Followers.findOne({ user: userId })
  //          .populate("followers", "userName email imageLink")
  //          .exec();

  //        const loggedInUserFollowingRecord =
  //          (await Following.findOne({ user: loggedInUserId })) || {};
  //        const subscriberRecord =
  //          (await Subscriptions.findOne({ user: loggedInUserId })) || {};

  //        const enhancedFollowersData = await enhanceUserData(
  //          userId,
  //          followersData.followers,
  //          loggedInUserFollowingRecord.following,
  //          subscriberRecord
  //        );
  //        console.log(enhancedFollowersData);
  //        //  console.log("fetchFollowers", enhancedFollowersData);
  //        res.json(enhancedFollowersData);
  //      } catch (error) {
  //        console.error(error);
  //        res.status(500).json({ message: "Server Error" });
  //      }
  //    });

  //    app.get("/fetchFollowing", async (req, res) => {
  //      try {
  //        const userId = req.query.userId;
  //        const followingData = await Following.findOne({ user: userId })
  //          .populate("following", "userName email imageLink")
  //          .exec();

  //        const loggedInUserFollowingRecord =
  //          (await Following.findOne({ user: userId })) || {};

  //        const subscriberRecord =
  //          (await Subscriptions.findOne({ user: userId })) || {};

  //        console.log("subscriberRecord", subscriberRecord);
  //        const enhancedFollowingData = await enhanceUserData(
  //          userId,
  //          followingData.following,
  //          loggedInUserFollowingRecord.following,
  //          subscriberRecord
  //        );
  //        console.log("enhancedFollowingData", enhancedFollowingData);

  //        res.json(enhancedFollowingData);
  //      } catch (error) {
  //        console.error(error);
  //        res.status(500).json({ message: "Server Error" });
  //      }
  //    });

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
