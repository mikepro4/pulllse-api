const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const keys = require("../config/keys");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const Audios = mongoose.model("Audio");
const User = mongoose.model("User");

const s3Client = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: keys.accessKeyId,
    secretAccessKey: keys.secretAccessKey,
  },
});

module.exports = (app) => {
  app.post("/api/deleteAudio", async (req, res) => {
    try {
      const { key } = req.body;

      if (!key) {
        return res.status(400).send("No file key provided");
      }

      // Deleting from Amazon S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: "my-audio-bucket-111",
        Key: key,
      });

      await s3Client.send(deleteCommand);

      // Deleting from the Audios database model
      await Audios.deleteOne({
        audioLink:
          "https://my-audio-bucket-111.s3.us-east-2.amazonaws.com/" + key,
      });

      res
        .status(200)
        .send({ message: "File and database record deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).send("Server Error");
    }
  });

  app.get("/api/userAudios", async (req, res) => {
    try {
      // You can extract userId from query or headers, depending on your client-side implementation
      // For this example, I'll extract it from the query
      const userId = req.query.userId;

      if (!userId) {
        return res.status(400).send("No userId provided");
      }

      const list = await Audios.find({ user: userId })
        .sort({ dateCreated: -1 }) // -1 for descending order, so latest posts come first
        .exec();

      res.send(list);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error fetching user audio posts");
    }
  });

  app.post("/api/saveAudioLink", async (req, res) => {
    try {
      const { audioLink, name, duration, user } = req.body;

      const newAudio = new Audios({
        name,
        audioLink,
        duration,
        user,
      });

      const savedAudio = await newAudio.save();
      res.status(200).json(savedAudio);
    } catch (error) {
      console.error("Error saving audio:", error);
      res.status(500).send("Server Error");
    }
  });

  app.get("/api/upload", async (req, res) => {
    try {
      const userId = req.query.userId;

      if (!userId) {
        return res.status(400).send("No userId provided in headers");
      }

      let uuid = uuidv4();

      const key = `${userId}/${uuid}.m4a`;
      const command = new PutObjectCommand({
        Bucket: "my-audio-bucket-111",
        Key: key,
        ContentType: "audio/x-m4a",
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600,
      });

      // Increment the postsCount for the user
      await User.findOneAndUpdate(
        { user: userId },
        { $inc: { postsCount: 1 } }
      );

      res.send({ key, url: signedUrl });
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to generate signed URL");
    }
  });
};

//
