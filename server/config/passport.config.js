// Modules
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

// Models
const User = require("../models/user.model");

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,

            callbackURL: process.env.GOOGLE_CALLBACK_URL
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const photo = profile.photos?.[0]?.value;

                let user = await User.findOne({ googleId: profile.id });

                if (!user) {
                    user = await User.findOne({ email: profile.emails[0].value });

                    if (!user) {
                        user = await User.create({
                            googleId: profile.id,
                            email: profile.emails[0].value,
                            fullname: profile.displayName,
                            avatar: photo,
                            provider: "google",
                            isVerified: true
                        });
                    } else {
                        user.googleId = profile.id;
                        if (photo && !user.avatar) user.avatar = photo;

                        await user.save({ validateBeforeSave: false });
                    };
                } else if (photo && user.avatar !== photo) {
                    user.avatar = photo;
                    await user.save({ validateBeforeSave: false });
                };

                done(null, user);
            } catch (err) {
                done(err);
            };
        }
    ),
);

