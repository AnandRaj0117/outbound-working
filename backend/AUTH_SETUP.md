# Authentication Setup Guide

This application supports two authentication modes:

## 1. Local Authentication (Development)
- **Accepts ANY username/password** (no database validation)
- No need for SAML/Microsoft configuration
- No Firestore setup required
- Perfect for local development and testing

## 2. SAML Authentication (Production)
- Uses Microsoft Azure AD via SAML
- Requires proper certificate and Azure configuration
- Used for deployed environments

---

## Quick Start for Local Development

### Step 1: Set Environment Variable

In your backend `.env` file, add:

```env
USE_LOCAL_AUTH=true
```

### Step 2: Start Backend Server

```bash
cd backend
npm install
node server.js
```

You should see:
```
🔐 Using LOCAL authentication mode (SAML disabled)
🔐 SAML routes disabled (using local auth mode)
```

### Step 3: Start Frontend

```bash
cd frontend
npm install
npm start
```

### Step 4: Login with ANY Credentials

1. Open http://localhost:3000
2. Enter **ANY** username and password:
   - Username: `anything@you.want`
   - Password: `anything`
3. Click "Log In"
4. You're in! No validation required.

The Microsoft SAML button will be hidden in local mode.

**Note:** In local mode, the system accepts any non-empty credentials and logs you in as "Local Dev User".

---

## Switching to Production (SAML Mode)

### Step 1: Update Environment Variable

In your backend `.env` file:

```env
USE_LOCAL_AUTH=false
```

### Step 2: Configure SAML Settings

Ensure these are set in your `.env`:

```env
SAML_PATH=/login/callback/
CALLBACKURL=https://your-production-url.com
CERT=ocadoSSO_ppd.cer  # or your production cert
```

### Step 3: Deploy

When deployed, the application will:
- Show the "Sign in with Microsoft" button
- Redirect to Azure AD for authentication
- Use SAML callback for user session

---

## How It Works

### Backend
1. `config/passport.js` - Conditionally loads SAML strategy based on `USE_LOCAL_AUTH`
2. `config/routes.js` - Registers different routes based on auth mode
3. `authentication/user_auth.js` - Creates session for local auth users

### Frontend
1. Checks `/auth/mode` endpoint on page load
2. Shows/hides Microsoft button based on response
3. Changes "Log In" button behavior (local auth vs SAML redirect)

---

## Security Notes

### For Local Development
- **NEVER** commit `.env` file with real credentials
- Use test/dummy credentials only
- Passwords in Firestore should be hashed in production

### For Production
- Always use `USE_LOCAL_AUTH=false`
- Ensure SAML certificates are valid and up-to-date
- Use environment-specific secrets management
- Rotate credentials regularly

---

## Troubleshooting

### "SAML configuration failed" on startup
- Set `USE_LOCAL_AUTH=true` in `.env`
- Verify `.env` file is in the backend root directory

### Login button redirects to SAML when it shouldn't
- Check backend console for auth mode log
- Verify `USE_LOCAL_AUTH=true` is in `.env`
- Restart backend server after changing `.env`

### "Unauthorized" after local login
- Check Firestore user exists with correct email/password
- Verify session middleware is working
- Check browser cookies are enabled

### Microsoft button shows when it shouldn't
- Clear frontend cache and reload
- Check `/auth/mode` endpoint response in Network tab
- Verify backend is running with correct env vars
