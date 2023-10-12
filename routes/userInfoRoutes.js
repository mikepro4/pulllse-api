const mongoose = require("mongoose");

const UserInfo = mongoose.model("UserInfo");

module.exports = (app) => {
  app.get("/searchUser", async (req, res) => {
    try {
      const { q } = req.query;

      let searchCriteria = {};

      if (q) {
        searchCriteria.userName = new RegExp(q, "i");
      }

      const matchedProfiles = await UserInfo.find(
        searchCriteria,
        "userName profileImage _id"
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
        "userName profileImage _id"
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
