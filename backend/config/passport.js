const SamlStrategy = require("@node-saml/passport-saml").Strategy;

module.exports = function (passport, config) {

  passport.serializeUser(function (user, done) {
    done(null, user);
  });

  passport.deserializeUser(function (user, done) {
    done(null, user);
  });

  // Only configure SAML strategy if not using local auth
  const useLocalAuth = process.env.USE_LOCAL_AUTH === 'true';

  if (!useLocalAuth) {
    console.log("🔐 Configuring SAML authentication strategy");
    passport.use(new SamlStrategy(
      config.passport.saml,
      function (profile, done) {
        console.log("SAML profile received");
        console.log("Raw profile:", profile);

        try {
          return done(null, {
            samlResponse: profile.getSamlResponseXml?.(), // Use optional chaining to avoid crashing
            mail: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
            upn: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
            firstName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
            lastName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']
          });
        } catch (err) {
          console.error("🔥 Error processing SAML profile:", err);
          return done(err);
        }
      }
    ));
  } else {
    console.log("🔐 Using LOCAL authentication mode (SAML disabled)");
  }

};
 
 