const mongoose = require("mongoose");
const Image = mongoose.model("Image");
const User = mongoose.model("User");

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const keys = require("../config/keys");
const { v4: uuidv4 } = require("uuid");

const s3Client = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: keys.accessKeyId,
    secretAccessKey: keys.secretAccessKey,
  },
});

module.exports = (app) => {
  app.post("/api/deleteImage", async (req, res) => {
    try {
      const { key } = req.body;

      if (!key) {
        return res.status(400).send("No file key provided");
      }

      // Deleting from Amazon S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: "my-photo-bucket-111", // Assuming same bucket is used for images
        Key: key,
      });

      await s3Client.send(deleteCommand);

      res
        .status(200)
        .send({ message: "File and database record deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).send("Server Error");
    }
  });

  app.get("/api/userImages", async (req, res) => {
    try {
      const userId = req.query.userId;

      if (!userId) {
        return res.status(400).send("No userId provided");
      }

      const userImage = await Image.findOne({ user: userId }).exec();

      if (!userImage) {
        return res.status(404).send("Image not found for the given user");
      }

      res.send(userImage);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error fetching user's image");
    }
  });

  app.post("/api/saveImageLink", async (req, res) => {
    try {
      const { imageLink, user } = req.body;
      console.log("user", user);

      // Check if the image already exists for the user
      let image = await Image.findOne({ user: user });

      if (image) {
        // Update the existing image link
        image.imageLink = imageLink;
        await image.save();
      } else {
        // Create a new image document and save it
        image = new Image({ imageLink, user });
        await image.save();
      }

      // Find and update the UserInfo document with the new or updated image's _id
      const userInfo = await User.findOne({ _id: user });
      if (userInfo) {
        userInfo.profileImage = image._id;
        await userInfo.save();
      } // You can add an else condition here if you want to handle the case where UserInfo doesn't exist for the user

      res.status(200).json(image);
    } catch (error) {
      console.error("Error saving or updating image:", error);
      res.status(500).send("Server Error");
    }
  });

  app.get("/api/createImage", async (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        return res.status(400).send("No userId provided in headers");
      }

      let uuid = uuidv4();
      const key = `${userId}/${uuid}.png`; // Assuming PNG images

      const command = new PutObjectCommand({
        Bucket: "my-photo-bucket-111", // Assuming same bucket is used for images
        Key: key,
        ContentType: "image/jpeg", // Change if not PNG
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
