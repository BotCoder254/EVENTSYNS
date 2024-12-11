const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(new LocalStrategy(async (username, password, done) => {
        try {
            // Find user by username or email
            const user = await User.findOne({
                $or: [
                    { username: username },
                    { email: username }
                ]
            });

            if (!user) {
                return done(null, false, { message: 'Invalid username or password' });
            }

            // Check password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return done(null, false, { message: 'Invalid username or password' });
            }

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error);
        }
    });
}; 