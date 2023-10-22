const mongoose = require("mongoose");
const UserLogs = mongoose.model("UserLogs");

const logUserAction = (req, res, next) => {
  const urlParts = req.url.split("/");
  const action = urlParts[urlParts.length - 1];
  const userId = req.body.user;
  console.log("action", action);

  const logEntry = new UserLogs({
    action,
    userId,
  });

  logEntry
    .save()
    .then(() => next())
    .catch((error) => {
      console.error("Logging failed", error);
      next();
    });
};

const logUserInteraction = async (req, res, next) => {
  const urlParts = req.url.split("/");
  const action = urlParts[urlParts.length - 1];
  const { userId, targetUserId } = req.body;
  console.log("action", action);

  try {
    await new UserLogs({
      action,
      userId,
      targetUserId,
    }).save();

    next();
  } catch (error) {
    console.error("Logging failed", error);
    next();
  }
};

module.exports = { logUserInteraction, logUserAction };
