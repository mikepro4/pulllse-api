const mongoose = require("mongoose");
const Feed = mongoose.model("Feed");
const requireLogin = require("../middlewares/requireLogin");

module.exports = (app) => {
  app.get("/feed/:userId", requireLogin, async (req, res) => {
    const { userId } = req.params;

    try {
      // Finding the Feed by userId and populating it with the details of each Pulse
      const userFeed = await Feed.findOne({ user: userId })
        .populate("feedItems")
        .exec();

      if (!userFeed) {
        return res.status(404).send("Feed not found");
      }

      // Sending the populated userFeed as a response
      res.json(userFeed);
    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  });
};
