const mongoose = require("mongoose");
const Followers = mongoose.model("Followers");
const Subscribers = mongoose.model("Subscribers");
const UserInfo = mongoose.model("UserInfo");
const Following = mongoose.model("Following");

module.exports = (app) => {
  app.post("/followUser", async (req, res) => {
    try {
      const loggedInUserId = req.body.loggedInUserId;
      const userIdToFollow = req.body.userIdToFollow;

      // Update Followers collection
      let followerRecord = await Followers.findOne({ user: loggedInUserId });
      if (!followerRecord) {
        followerRecord = new Followers({ user: loggedInUserId });
      }
      followerRecord.followers.push(userIdToFollow);
      await followerRecord.save();

      // Update Following collection for the logged-in user
      let followingRecord = await mongoose
        .model("Following")
        .findOne({ user: loggedInUserId });
      if (!followingRecord) {
        followingRecord = new mongoose.model("Following")({
          user: loggedInUserId,
        });
      }
      followingRecord.following.push(userIdToFollow);
      await followingRecord.save();

      // Increment followersCount for the user being followed
      await UserInfo.updateOne(
        { user: userIdToFollow },
        { $inc: { followersCount: 1 } }
      );

      // Increment followingCount for the logged-in user
      await UserInfo.updateOne(
        { user: loggedInUserId },
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
      const { q } = req.query;

      let searchCriteria = {};

      if (q) {
        searchCriteria.userName = new RegExp(q, "i");
      }

      const matchedProfiles = await UserInfo.find(
        searchCriteria,
        "user userName profileImage _id "
      )
        .populate("profileImage", "imageLink")
        .limit(10);

      res.json(matchedProfiles);
    } catch (error) {
      console.error("Error fetching matched profiles: ", error);
      res.status(500).json({ message: "Server Error" });
    }
  });
  app.get("/searchUser/fetchInitialProfiles", async (req, res, next) => {
    try {
      const initialProfiles = await UserInfo.find(
        {},
        "user userName profileImage _id"
      )
        .populate("profileImage", "imageLink")
        .limit(10);

      res.json(initialProfiles);
    } catch (error) {
      console.error("Error fetching initial profiles: ", error);
      res.status(500).json({ message: "Server Error" });
    }
  });

  app.get("/userinfo/:userId", async (req, res, next) => {
    try {
      const userId = req.params.userId;

      // Check if user ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID." });
      }

      const userInfo = await UserInfo.findOne({ user: userId })
        .populate("user", "email")
        .populate("profileImage", "imageLink");

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
