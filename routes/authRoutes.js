const passport = require("passport");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const keys = require("../config/keys");
const querystring = require("querystring");
const axios = require("axios");
const { log } = require("console");

const User = mongoose.model("User");
const redirect_uri = "https://bcd7-108-36-184-166.ngrok-free.app/callback";
//ar redirect_uri = "http://localhost:4000/callback";
const client_id = keys.spotifyClientId;
const client_secret = keys.spotifyClientSecret;
const stateKey = "spotify_auth_state";

module.exports = (app) => {
  app.get("/callback", async (req, res) => {
    var code = req.query.code || null;
    var state = req.query.state || null;
    const authOptions = {
      method: "post",
      url: "https://accounts.spotify.com/api/token",
      data: querystring.stringify({
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      }),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          new Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
    };

    try {
      const response = await axios(authOptions);
      if (response.status === 200) {
        const access_token = response.data.access_token;
        const refresh_token = response.data.refresh_token;

        // Redirect to the app with the tokens
        res.redirect(
          `pulse://callback?access_token=${access_token}&refresh_token=${refresh_token}`
        );
      }
    } catch (error) {
      console.error(error);
    }
  });

  app.get("/loginSpotify", (req, res) => {
    const state = uuidv4();
    const scope = "user-read-private user-read-email";
    res.cookie(stateKey, state);
    res.redirect(
      "https://accounts.spotify.com/authorize?" +
        querystring.stringify({
          response_type: "code",
          client_id,
          scope,
          redirect_uri,
          state,
          show_dialog: true,
        })
    );
  });

  app.post("/signin", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(422).send({ error: info.message });

      req.logIn(user, { session: false }, async (err) => {
        if (err) return next(err);

        try {
          const token = jwt.sign({ userId: user._id }, "MY_SECRET_KEY");

          // Send back both the token and the user ID
          res.send({
            token,
            userId: user._id.toString(),
            userInfo: user,
          });
        } catch (err) {
          return next(err);
        }
      });
    })(req, res, next);
  });

  app.post("/signup", async (req, res, next) => {
    try {
      const { email, password, userName } = req.body;

      let user = await User.findOne({ email: email })
        .select("+email +password")
        .exec();
      if (user) {
        return res.status(400).json({ message: "User already registered." });
      }

      user = new User({ email, password, userName });

      await user.save();

      req.logIn(user, { session: false }, async (err) => {
        if (err) return next(err);

        try {
          const token = jwt.sign({ userId: user._id }, "MY_SECRET_KEY");
          console.log(token);
          res.json({
            message: "User registered and authenticated successfully.",
            email: email,
            userId: user._id.toString(),
            token,
            userName,
          });
        } catch (error) {
          console.log(error);
          return next(error);
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
    }
  });
};
