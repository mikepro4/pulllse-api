const mongoose = require("mongoose");
const Followers = mongoose.model("Followers");
const Subscribers = mongoose.model("Subscribers");
const User = mongoose.model("User");
const Following = mongoose.model("Following");

module.exports = (app) => {
  app.get("/fetchFollowing", async (req, res) => {
    try {
      const userId = req.query.userId;

      // Check if user ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID." });
      }

      // Fetch the logged-in user's following list
      const loggedInUserFollowingRecord = await Following.findOne({
        user: userId,
      });

      let loggedInUserFollowing = [];
      if (loggedInUserFollowingRecord) {
        loggedInUserFollowing = loggedInUserFollowingRecord.following.map(
          (id) => String(id)
        );
      }

      // Fetch Following data
      const followingData = await Following.findOne({ user: userId })
        .populate("following", "userName email imageLink")
        .exec();
      console.log(followingData);
      // Check if followingData exists
      if (!followingData) {
        return res.status(404).json({ message: "Following list not found." });
      }

      // Modify the following data to include the isFollowing property
      const modifiedFollowingData = followingData.following.map(
        (following) => ({
          ...following._doc,
          isFollowing: loggedInUserFollowing.includes(String(following._id)), // Add the isFollowing property
        })
      );

      // Send the modified following data as response
      res.json(modifiedFollowingData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
    }
  });

  app.get("/fetchFollowers", async (req, res) => {
    try {
      const userId = req.query.userId;

      // Check if user ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID." });
      }

      // Fetch the logged-in user's following list
      const loggedInUserFollowingRecord = await Followers.findOne({
        user: userId,
      });

      let loggedInUserFollowing = [];
      if (loggedInUserFollowingRecord) {
        loggedInUserFollowing = loggedInUserFollowingRecord.followers.map(
          (id) => String(id)
        );
      }

      // Fetch Followers data
      const followersData = await Followers.findOne({ user: userId })
        .populate("followers", "userName email imageLink")
        .exec();

      // Check if followersData exists
      if (!followersData) {
        return res.status(404).json({ message: "Followers not found." });
      }

      // Modify the followers data to include the isFollowing property
      const modifiedFollowersData = followersData.followers.map((follower) => ({
        ...follower._doc,
        isFollowing: loggedInUserFollowing.includes(String(follower._id)), // Add the isFollowing property
      }));
      console.log("followersData.followers", followersData.followers);
      console.log("loggedInUserId", userId);

      // Send the modified followers data as response
      res.json(modifiedFollowersData);
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
      let followingRecord = await mongoose
        .model("Following")
        .findOne({ user: loggedInUserId });

      if (!followingRecord) {
        followingRecord = new mongoose.model("Following")({
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

  app.get("/searchUser", async (req, res) => {
    try {
      const { q, loggedInUserId } = req.query;

      let searchCriteria = {};

      if (q) {
        searchCriteria.userName = new RegExp(q, "i");
      }

      // Fetch the users that the logged-in user is following
      const loggedInUserFollowingRecord = await mongoose
        .model("Following")
        .findOne({ user: loggedInUserId });

      let loggedInUserFollowing = [];
      if (loggedInUserFollowingRecord) {
        loggedInUserFollowing = loggedInUserFollowingRecord.following.map(
          (id) => id.toString()
        );
      }

      const matchedProfiles = await User.find(
        {
          ...searchCriteria,
          _id: { $ne: loggedInUserId }, // exclude the logged-in user from the results
        },
        " userName imageLink _id "
      ).limit(10);

      // Modify each matched profile to include the isFollowing property
      const modifiedProfiles = matchedProfiles.map((profile) => ({
        ...profile._doc,
        isFollowing: loggedInUserFollowing.includes(String(profile._id)),
      }));

      res.json(modifiedProfiles);
    } catch (error) {
      console.error("Error fetching matched profiles: ", error);
      res.status(500).json({ message: "Server Error" });
    }
  });

  app.get("/searchUser/fetchInitialProfiles", async (req, res, next) => {
    try {
      const loggedInUserId = req.query.loggedInUserId; // Get the loggedInUserId from the query parameters

      // Fetch the users that the logged-in user is following
      const loggedInUserFollowingRecord = await mongoose
        .model("Following")
        .findOne({ user: loggedInUserId });

      let loggedInUserFollowing = [];
      if (loggedInUserFollowingRecord) {
        loggedInUserFollowing = loggedInUserFollowingRecord.following.map(
          (id) => String(id)
        );
      }

      // Fetch initial profiles excluding the logged-in user
      const initialProfiles = await User.find(
        {
          _id: { $ne: loggedInUserId }, // Exclude the logged-in user
        },
        "userName imageLink _id" // Corrected the projection here
      ).limit(10);

      // Modify each profile in initialProfiles to include the isFollowing property
      const modifiedInitialProfiles = initialProfiles.map((profile) => ({
        ...profile._doc,
        isFollowing: loggedInUserFollowing.includes(String(profile._id)), // Convert ObjectId to string
      }));

      res.json(modifiedInitialProfiles);
    } catch (error) {
      console.error("Error fetching initial profiles: ", error);
      res.status(500).json({ message: `Server Error: ${error.message}` }); // Enhanced error message
    }
  });

  app.get("/userinfo/:userId", async (req, res, next) => {
    try {
      const userId = req.params.userId;

      // Check if user ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID." });
      }

      const userInfo = await User.findOne({ _id: userId });

      if (!userInfo) {
        return res.status(404).json({ message: "User info not found." });
      }

      res.json(userInfo);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
    }
  });
};
