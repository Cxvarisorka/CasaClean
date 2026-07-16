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
                const email = profile.emails?.[0]?.value;

                let user = await User.findOne({ googleId: profile.id });

                if (!user) {
                    // Only link/create by email when Google has actually
                    // verified that address. Otherwise an attacker could
                    // register an unverified Google account with a victim's
                    // email and take over their local account here.
                    if (!email || profile._json?.email_verified !== true) {
                        return done(null, false, { message: "Google account email is not verified." });
                    }

                    user = await User.findOne({ email });

                    if (!user) {
                        user = await User.create({
                            googleId: profile.id,
                            email,
                            fullname: profile.displayName,
                            avatar: photo,
                            provider: "google",
                            isVerified: true
                        });
                    } else {
                        user.googleId = profile.id;
                        if (photo && !user.avatar) user.avatar = photo;

                        // Pre-registration takeover defence: if the local
                        // account was never verified, its password was chosen
                        // by whoever originally signed the email up — possibly
                        // NOT the person now proving ownership via Google.
                        // Drop that password (a fresh one can be set via
                        // forgot-password) and honour Google's verification.
                        if (!user.isVerified) {
                            user.password = undefined;
                            user.verificationToken = undefined;
                            user.verificationTokenExpires = undefined;
                            user.isVerified = true;
                        }

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

