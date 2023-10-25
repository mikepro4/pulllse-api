const mongoose = require("mongoose");
const Feed = mongoose.model("Feed");
const requireLogin = require("../middlewares/requireLogin");

module.exports = (app) => {
  app.post("/feed/fetchFeed", async (req, res) => {
    const { userId, page = 1, limit, timeStamp } = req.body;
    console.log(userId)

    const ObjectId = mongoose.Types.ObjectId;
    const userIdObj = new ObjectId(userId);
    const skip = (page - 1) * limit;
    try {
      // Finding the Feed by userId and populating it with the details of each Pulse
      const userFeed = await Feed.find({
      //   dateCreated: {
      //     $lte: timeStamp
      // },
        targetUsers: userIdObj,
      })
        .select("-targetUsers")
        .populate({
          path: "pulse",
          model: "Pulse",
          populate: {
            path: "audio",
            model: "Audio",
          },
        })
        .populate({
          path: "pulse",
          model: "Pulse",
          populate: {
            path: "user",
            model: "User",
          },
        })
        .limit(limit)
        .skip(skip)
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
