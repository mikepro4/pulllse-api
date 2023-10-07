const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { createRequest } = require("@aws-sdk/util-create-request");
const { formatUrl } = require("@aws-sdk/util-format-url");
const bcrypt = require("bcryptjs");
const keys = require("../config/keys");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const Audio = mongoose.model("Audio");

const s3Client = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: keys.accessKeyId,
    secretAccessKey: keys.secretAccessKey,
  },
});

module.exports = (app) => {
  app.get("/api/userAudios", async (req, res) => {
    try {
      // Extract userId from request headers or query (based on how you send it)
      const auth = req.headers.authorization;
      const userId = auth.slice(0, 10);

      if (!userId) {
        return res.status(400).send("No userId provided");
      }

      const audios = await Audio.find({
        userId: mongoose.Types.ObjectId(userId),
      })
        .sort({ dateCreated: -1 }) // -1 for descending order, so latest posts come first
        .exec();

      res.send(audios);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error fetching user audio posts");
    }
  });

  app.post("/api/saveAudioLink", async (req, res) => {
    try {
      const { audioLink, name, userId } = req.body;

      if (!audioLink || !name || !userId) {
        return res.status(400).send("Missing required fields");
      }

      const newAudio = new Audio({
        name,
        userId,
        audioLink,
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
      const auth = req.headers.authorization;
      const userId = auth.slice(7, 17);
      if (!userId) {
        return res.status(400).send("No userId provided in headers");
      }

      const key = `${userId}/${uuidv4()}.caf`;
      const command = new PutObjectCommand({
        Bucket: "my-audio-bucket-111",
        Key: key,
        ContentType: "audio/x-caf",
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600,
      });

      res.send({ key, url: signedUrl });
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to generate signed URL");
    }
  });
};

//
