const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const passport = require("passport");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const keys = require("./config/keys");
const cors = require("cors");
const cookieParser = require("cookie-parser");

require("./models/User");

require("./models/Audio");
require("./models/Pulse");
require("./models/Feed");
require("./models/Followers");
require("./models/Following");
require("./models/Subscribers");
require("./models/Subscriptions");
require("./models/Notifications");
require("./models/UserLogs");

require("./services/passport");

const app = express();

const server = http.createServer(app);
const io = socketIo(server);

const userSockets = {};

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("setUserId", (userId) => {
    userSockets[userId] = socket.id;
  });

  socket.on("disconnect", () => {
    // Removing user from the userSockets map on disconnection
    const userIdToRemove = Object.keys(userSockets).find(
      (userId) => userSockets[userId] === socket.id
    );
    if (userIdToRemove) {
      delete userSockets[userIdToRemove];
    }
    console.log("User disconnected");
  });

  socket.on("connect_error", (error) => {
    console.log("Connection Error", error);
  });
});

app.use(bodyParser.json());
app.use(passport.initialize());
app.use(cors());
app.use(cookieParser());

mongoose.connect(keys.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

require("./routes/authRoutes")(app);
require("./routes/audioRoutes")(app);
require("./routes/pulseRoutes")(app);
require("./routes/feedRoutes")(app);
require("./routes/imageRoutes")(app);
require("./routes/userInfoRoutes")(app);
require("./routes/notificationsRoutes")(app);
require("./routes/subscribersRoutes")(app, io, userSockets);
require("./routes/followersRoutes")(app, io, userSockets);

const PORT = process.env.PORT || 4000;
server.listen(PORT);
