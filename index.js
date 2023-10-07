const express = require("express");
const passport = require("passport");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const keys = require("./config/keys");

require("./models/User");
require("./models/Audio");

require("./services/passport");

const app = express();
app.use(bodyParser.json());
app.use(passport.initialize());
// app.use(passport.session());

mongoose.connect(keys.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

require("./routes/authRoutes")(app);
require("./routes/uploadRoutes")(app);
const PORT = process.env.PORT || 4000;
app.listen(PORT);
