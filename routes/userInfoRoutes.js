const mongoose = require("mongoose");
const Followers = mongoose.model("Followers");
const Subscribers = mongoose.model("Subscribers");
const User = mongoose.model("User");
const Following = mongoose.model("Following");

module.exports = (app) => {
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
