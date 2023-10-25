const mongoose = require("mongoose");
const Pulse = mongoose.model("Pulse");
const Feed = mongoose.model("Feed");
const Followers = mongoose.model("Followers");
const requireLogin = require("../middlewares/requireLogin");

module.exports = (app) => {
  // ===========================================================================

  app.post("/pulse/createPulse", requireLogin, async (req, res) => {
    const { name, userId, audioId } = req.body;
    console.log("here");
    try {
      // Creating a new Pulse
      const newPulse = await new Pulse({
        dateCreated: new Date(),
        name,
        user: userId,
        audio: audioId,
      }).save();

      // Finding the followers of the user who created the Pulse
      const userFollowers = await Followers.findOne({ user: userId });

      // If the user has followers, update the Feed of each follower
      let targetUsers = []
      if (userFollowers && userFollowers.followers.length > 0) {
        targetUsers = userFollowers.followers;
        targetUsers.push(newPulse.user);
      } else {
        targetUsers.push(newPulse.user);
      }

      await new Feed({
        dateCreated: new Date(),
        user: userId,
        targetUsers: targetUsers,
        pulse: newPulse._id,
      }).save();

      // Sending the created Pulse as a response
      res.json(newPulse);
    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  });

  // ===========================================================================

  app.get("/pulse/fetchPulse", requireLogin, async (req, res) => {
    try {
      const pulses = await Pulse.find()
        .populate("user")
        .populate("audio")

      res.json(pulses);
    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  });

  // ===========================================================================

  app.post("/pulse/deletePulse", requireLogin, async (req, res) => {
    const { pulseId, userId } = req.body;

    try {
      // Finding the Pulse by ID
      const pulse = await Pulse.findById(pulseId);

      if (!pulse) {
        return res.status(404).send("Pulse not found");
      }

      // Ensuring the user deleting the Pulse is the creator
      if (pulse.user.toString() !== userId) {
        return res.status(403).send("Unauthorized");
      }

      // Removing the Pulse
      await pulse.remove();

      // Removing the Pulse from the feeds of all users
      const feedItem = await Feed.findById({ "pulse._id": pulseId });
      await feedItem.remove();

      // Sending a success response
      res.json({ msg: "Pulse deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  });

  // ===========================================================================
};
