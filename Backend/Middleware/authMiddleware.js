import passport from 'passport';
import LocalStrategy from 'passport-local';
import authService from '../Services/authService.js';

// Configure Local Strategy
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await authService.authenticateUser(email, password);
      return done(null, user);
    } catch (error) {
      return done(null, false, { message: error.message });
    }
  }
));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.userid);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await authService.findUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
