require("dotenv").config();
module.exports = function (app, config, passport) {

  const useLocalAuth = process.env.USE_LOCAL_AUTH === 'true';

  // Endpoint to check which auth mode is active
  app.get('/auth/mode', (req, res) => {
    res.json({
      useLocalAuth,
      authMode: useLocalAuth ? 'local' : 'saml'
    });
  });

  // SAML Routes (only enabled when not using local auth)
  if (!useLocalAuth) {
    console.log("🔐 Registering SAML authentication routes");

    // Redirects user to Azure login page
    app.get('/login',
      passport.authenticate(config.passport.strategy, {
        successRedirect: '/profile',
        failureRedirect: '/login'
      })
    );

    // Azure calls this endpoint after login
    app.post(config.passport.saml.path,
      passport.authenticate(config.passport.strategy, { failureRedirect: '/login', failureFlash: true }),
      (req, res) => {
        console.log("✅ SAML authentication successful for:", req.user?.mail);
        console.log("Session ID before save:", req.sessionID);

        req.session.save(err => {
          if (err) console.error("Session save error:", err);
          const redirectURL = `${process.env.ORIGIN}/landing`;
          console.log("Redirecting user to:", redirectURL);
          res.redirect(redirectURL);
        });
      }
    );
  } else {
    console.log("🔐 SAML routes disabled (using local auth mode)");

    // Local auth - redirect to frontend login page if someone tries to access /login
    app.get('/login', (req, res) => {
      res.redirect(process.env.ORIGIN || 'http://localhost:3000');
    });
  }

  // Return logged-in user info (works for both SAML and local auth)
  app.get('/profile', (req, res) => {
    if (req.isAuthenticated()) {
      // Add a formatted name field to the user object
      const user = {
        ...req.user,
        name: req.user.authMode === 'local'
          ? 'Local User'
          : `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.mail
      };
      res.json({ user });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  });

  // Logout route (works for both auth modes)
  app.get('/logout', (req, res, next) => {
    req.logout(function (err) {
      if (err) return next(err);
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.status(200).json({ success: true });
      });
    });
  });

};