const express = require("express");
const passport = require("passport");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const keys = require("./config/keys");
const cors = require("cors");

require("./models/User");

require("./models/Audio");
require("./models/Pulse");
require("./models/Image");
require("./models/Followers");
require("./models/Subscribers");
require("./models/Following");

require("./services/passport");

const app = express();
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(cors());
// app.use(passport.session());

mongoose.connect(keys.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

require("./routes/authRoutes")(app);
require("./routes/uploadRoutes")(app);
require("./routes/pulseRoutes")(app);
require("./routes/imageRoutes")(app);
require("./routes/userInfoRoutes")(app);

const PORT = process.env.PORT || 4000;
app.listen(PORT);
