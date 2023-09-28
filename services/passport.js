const passport = require("passport");
const mongoose = require("mongoose");
const LocalStrategy = require("passport-local").Strategy;

const User = mongoose.model("User");

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => {
    done(null, user);
  });
});

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) return done(null, false, { message: "Incorrect email" });

        const isMatch = await user.comparePassword(password);
        if (!isMatch)
          return done(null, false, { message: "Password incorrect" });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
