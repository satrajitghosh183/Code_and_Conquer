const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pgSession = require('connect-pg-simple')(session);
const db = require('./db');
require('dotenv').config();

const app = express();

// Set view engine (optional)
app.set('view engine', 'ejs');

// Session middleware
app.use(
  session({
    store: new pgSession({
      pool: db,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const result = await db.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);

        if (result.rows.length > 0) {
          done(null, result.rows[0]);
        } else {
          const newUser = await db.query(
            `INSERT INTO users (google_id, display_name, email, photo_url)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [
              profile.id,
              profile.displayName,
              profile.emails?.[0]?.value || null,
              profile.photos?.[0]?.value || null,
            ]
          );
          done(null, newUser.rows[0]);
        }
      } catch (err) {
        done(err, null);
      }
    }
  )
);


// Home
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
      res.render('home', { user: req.user });
    } else {
      res.render('home', { user: null });
    }
  });
  
  // Auth routes
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  
  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/');
    }
  );
  
  // Logout
  app.get('/logout', (req, res) => {
    req.logout(() => {
      res.redirect('/');
    });
  });
  