const mongoose = require("mongoose");
const Subscriptions = mongoose.model("Subscriptions");
const User = mongoose.model("User");
const Following = mongoose.model("Following");

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
      let isFollowing = loggedInUserRecords.includes(String(userData._id));

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
  app.get("/searchUser", async (req, res) => {
    try {
      const { q, loggedInUserId } = req.query;

      let searchCriteria = {};

      if (q) {
        searchCriteria.userName = new RegExp(q, "i");
      }

      const matchedProfiles = await User.find(
        {
          ...searchCriteria,
          _id: { $ne: loggedInUserId },
        },
        " userName imageLink _id "
      ).limit(10);

      const loggedInUserFollowingRecord =
        (await Following.findOne({ user: loggedInUserId })) || {};
      const subscriberRecord =
        (await Subscriptions.findOne({ user: loggedInUserId })) || {};

      const modifiedInitialProfiles = await enhanceUserData(
        loggedInUserId,
        matchedProfiles,
        loggedInUserFollowingRecord.following,
        subscriberRecord
      );
      console.log("modifiedInitialProfiles", modifiedInitialProfiles);
      res.json(modifiedInitialProfiles);
    } catch (error) {
      console.error("Error fetching matched profiles: ", error);
      res.status(500).json({ message: "Server Error" });
    }
  });

  app.get("/searchUser/fetchInitialProfiles", async (req, res, next) => {
    try {
      const loggedInUserId = req.query.loggedInUserId;

      const initialProfiles = await User.find(
        {
          _id: { $ne: loggedInUserId },
        },
        "userName imageLink _id"
      ).limit(10);

      const loggedInUserFollowingRecord =
        (await Following.findOne({ user: loggedInUserId })) || {};
      const subscriberRecord =
        (await Subscriptions.findOne({ user: loggedInUserId })) || {};

      const modifiedInitialProfiles = await enhanceUserData(
        loggedInUserId,
        initialProfiles,
        loggedInUserFollowingRecord.following,
        subscriberRecord
      );

      res.json(modifiedInitialProfiles);
    } catch (error) {
      console.error("Error fetching initial profiles: ", error);
      res.status(500).json({ message: `Server Error: ${error.message}` });
    }
  });

  app.get("/userinfo/:userId", async (req, res, next) => {
    try {
      const userId = req.params.userId;

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
