const mongoose = require("mongoose");
const Followers = mongoose.model("Followers");
const Following = mongoose.model("Following");
const Subscribers = mongoose.model("Subscribers");
const Subscriptions = mongoose.model("Subscriptions");
const User = mongoose.model("User");
const Notifications = mongoose.model("Notifications");

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

module.exports = (app) => {
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

  app.post("/unfollowUser", async (req, res) => {
    try {
      const loggedInUserId = req.body.loggedInUserId;
      const userIdToUnfollow = req.body.userIdToUnfollow;

      // Update Followers collection
      await Followers.updateOne(
        { user: userIdToUnfollow },
        { $pull: { followers: loggedInUserId } } // removed ObjectId conversion
      );

      // Update Following collection for the logged-in user
      await Following.updateOne(
        { user: loggedInUserId }, // removed ObjectId conversion
        { $pull: { following: userIdToUnfollow } } // removed ObjectId conversion
      );

      // Decrement followersCount for the user being unfollowed
      await User.updateOne(
        { _id: userIdToUnfollow }, // removed ObjectId conversion
        { $inc: { followersCount: -1 } }
      );

      // Decrement followingCount for the logged-in user
      await User.updateOne(
        { _id: loggedInUserId }, // removed ObjectId conversion
        { $inc: { followingCount: -1 } }
      );

      res.status(200).json({ message: "Unfollowed successfully" });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).send("Server Error");
    }
  });
  app.post("/followUser", async (req, res) => {
    try {
      const loggedInUserId = req.body.loggedInUserId;
      const userIdToFollow = req.body.userIdToFollow;

      // Prevent following oneself
      if (loggedInUserId === userIdToFollow) {
        return res.status(400).json({ message: "You cannot follow yourself" });
      }

      // Update Following collection for the logged-in user
      let followingRecord = await Following.findOne({ user: loggedInUserId });

      if (!followingRecord) {
        followingRecord = new Following({
          user: loggedInUserId,
        });
      }

      // Check if the user is already following the userToFollow
      if (followingRecord.following.includes(userIdToFollow)) {
        return res
          .status(400)
          .json({ message: "You are already following this user" });
      }

      followingRecord.following.push(userIdToFollow);
      await followingRecord.save();

      // Update Followers collection for the user to be followed
      let followerRecord = await Followers.findOne({ user: userIdToFollow });
      if (!followerRecord) {
        followerRecord = new Followers({ user: userIdToFollow });
      }

      followerRecord.followers.push(loggedInUserId);
      await followerRecord.save();

      // Increment followersCount for the user being followed
      await User.updateOne(
        { _id: userIdToFollow },
        { $inc: { followersCount: 1 } }
      );

      // Increment followingCount for the logged-in user
      await User.updateOne(
        { _id: loggedInUserId },
        { $inc: { followingCount: 1 } }
      );

      res.status(200).json({ message: "Followed successfully" });
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).send("Server Error");
    }
  });
};
