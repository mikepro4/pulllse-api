const passport = require("passport");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = mongoose.model("User");

module.exports = (app) => {
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
