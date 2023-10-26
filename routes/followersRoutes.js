const mongoose = require("mongoose");
const Followers = mongoose.model("Followers");
const Following = mongoose.model("Following");
const Subscribers = mongoose.model("Subscribers");
const Subscriptions = mongoose.model("Subscriptions");
const User = mongoose.model("User");
const Notifications = mongoose.model("Notifications");
const createLog = require("../middlewares/createLog");

async function enhanceUserData(
  userId,
  userDataArray,
  loggedInUserRecords,
  subscriberRecords
) {
  loggedInUserRecords = loggedInUserRecords || [];
  subscriberRecords = subscriberRecords.subscriptions || [];

  return await Promise.all(
    userDataArray.map(async (userData) => {
      let isFollowing = loggedInUserRecords.includes(userData._id);

      let subscription = subscriberRecords.find(
        (sub) => String(sub.subscribee) === String(userData._id)
      );

      let isSubscribed = subscription ? subscription.status : "not_subscribed";

      return {
        ...userData._doc,
        isFollowing,
        isSubscribed,
      };
    })
  );
}

module.exports = (app, io) => {
  app.get("/fetchFollowers", async (req, res) => {
    try {
      const loggedInUserId = req.query.loggedInUserId;
      const userId = req.query.userId;

      const followersData = await Followers.findOne({ user: userId })
        .populate("followers", "userName email imageLink")
        .exec();
      console.log("followersData", followersData);
      const loggedInUserFollowingRecord =
        (await Following.findOne({ user: loggedInUserId })) || {};
      const subscriberRecord =
        (await Subscriptions.findOne({ user: loggedInUserId })) || {};

      const enhancedFollowersData = await enhanceUserData(
        userId,
        followersData.followers,
        loggedInUserFollowingRecord.following,
        subscriberRecord
      );
      console.log("enhancedFollowersData", enhancedFollowersData);
      //  console.log("fetchFollowers", enhancedFollowersData);
      res.json(enhancedFollowersData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
    }
  });

  app.get("/fetchFollowing", async (req, res) => {
    try {
      const userId = req.query.userId;
      const followingData = await Following.findOne({ user: userId })
        .populate("following", "userName email imageLink")
        .exec();

      const loggedInUserFollowingRecord =
        (await Following.findOne({ user: userId })) || {};

      const subscriberRecord =
        (await Subscriptions.findOne({ user: userId })) || {};

      console.log("subscriberRecord", subscriberRecord);
      const enhancedFollowingData = await enhanceUserData(
        userId,
        followingData.following,
        loggedInUserFollowingRecord.following,
        subscriberRecord
      );
      console.log("enhancedFollowingData", enhancedFollowingData);

      res.json(enhancedFollowingData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
    }
  });

  app.post("/unfollowUser", createLog.logUserInteraction, async (req, res) => {
    try {
      const { userId, targetUserId } = req.body;
      // Update Followers collection
      await Followers.updateOne(
        { user: targetUserId },
        { $pull: { followers: userId } } // removed ObjectId conversion
      );

      // Update Following collection for the logged-in user
      await Following.updateOne(
        { user: userId }, // removed ObjectId conversion
        { $pull: { following: targetUserId } } // removed ObjectId conversion
      );

      // Decrement followersCount for the user being unfollowed
      await User.updateOne(
        { _id: targetUserId }, // removed ObjectId conversion
        { $inc: { followersCount: -1 } }
      );

      // Decrement followingCount for the logged-in user
      await User.updateOne(
        { _id: userId }, // removed ObjectId conversion
        { $inc: { followingCount: -1 } }
      );

      res.status(200).json({ message: "Unfollowed successfully" });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).send("Server Error");
    }
  });
  app.post("/followUser", createLog.logUserInteraction, async (req, res) => {
    try {
      const { userId, targetUserId } = req.body;

      // Prevent following oneself
      if (userId === targetUserId) {
        return res.status(400).json({ message: "You cannot follow yourself" });
      }

      // Update Following collection for the logged-in user
      let followingRecord = await Following.findOne({ user: userId });
      console.log("followingRecord", followingRecord);

      if (!followingRecord) {
        followingRecord = new Following({
          user: userId,
        });
      }

      if (followingRecord.following.includes(targetUserId)) {
        return res
          .status(400)
          .json({ message: "You are already following this user" });
      }

      followingRecord.following.push(targetUserId);
      await followingRecord.save();

      // Update Followers collection for the user to be followed
      let followerRecord = await Followers.findOne({
        user: targetUserId,
      });
      if (!followerRecord) {
        followerRecord = new Followers({ user: targetUserId });
      }

      followerRecord.followers.push(userId);
      await followerRecord.save();

      // Increment followersCount for the user being followed
      await User.updateOne(
        { _id: targetUserId },
        { $inc: { followersCount: 1 } }
      );

      // Increment followingCount for the logged-in user
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        { $inc: { followingCount: 1 } },
        { new: true } // This option returns the modified document rather than the original.
      );

      const notification = new Notifications({
        to: targetUserId,
        from: userId,
        type: "follow",
      });
      await notification.save();

      io.emit("notification", {
        to: targetUserId,
        message: `User ${updatedUser.userName} is now following you`,
        // You can add more data to the emitted event as needed
      });

      res.status(200).json({ message: "Followed successfully" });
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).send("Server Error");
    }
  });
};
