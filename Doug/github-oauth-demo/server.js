import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';

const app = express();

// --- Session (required for Passport) ---
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true }
  })
);

// --- Passport setup ---
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: '/auth/github/callback', // full URL: http://localhost:3000/auth/github/callback
      scope: ['read:user', 'user:email'] // ask for basic profile + emails
    },
    // Verify callback: called after GitHub says “this user is legit”
    async (accessToken, refreshToken, profile, done) => {
      // TODO: find-or-create user in your DB.
      // For demo, we attach what we need to a plain object.
      const user = {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        photos: profile.photos,
        accessToken // Store in DB if you plan to call GitHub API later
      };
      return done(null, user);
    }
  )
);

// Minimal serialize/deserialize (store small user info in session)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.use(passport.initialize());
app.use(passport.session());

// --- Routes ---
app.get('/', (req, res) => {
  res.send(`
    <h1>GitHub OAuth Demo</h1>
    ${req.user ? `
      <p>Signed in as ${req.user.username}</p>
      <img src="${req.user.photos?.[0]?.value || ''}" width="80"/>
      <br/><a href="/profile">View Profile JSON</a>
      <br/><a href="/logout">Logout</a>
    ` : `
      <a href="/auth/github">Login with GitHub</a>
    `}
  `);
});

app.get('/auth/github', passport.authenticate('github'));

app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/?login=failed' }),
  (req, res) => res.redirect('/') // success
);

app.get('/profile', ensureAuthed, (req, res) => {
  res.type('json').send(JSON.stringify(req.user, null, 2));
});

app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect('/'));
  });
});

function ensureAuthed(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}

app.listen(process.env.PORT, () => {
  console.log(`http://localhost:${process.env.PORT}`);
});