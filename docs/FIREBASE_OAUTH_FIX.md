# Firebase OAuth Domain Authorization Fix

## Error Message:
```
Firebase: This domain is not authorized for OAuth operations for your Firebase project.
Edit the list of authorized domains from the Firebase console.
```

## Root Cause:
The custom domain `alphasearch.gridnetai.com` is not added to Firebase's authorized domains list.

## Fix Steps:

### 1. Add Authorized Domain in Firebase Console

1. Go to: https://console.firebase.google.com/project/alpha-search-index/authentication/settings
2. Click on the **"Settings"** tab (next to "Sign-in method")
3. Scroll down to **"Authorized domains"** section
4. Click **"Add domain"**
5. Enter: `alphasearch.gridnetai.com`
6. Click **"Add"**

### 2. Verify Current Authorized Domains

You should see:
- ✅ `localhost` (for local development)
- ✅ `alpha-search-index.web.app` (Firebase Hosting default)
- ✅ `alpha-search-index.firebaseapp.com` (Firebase Hosting)
- ✅ `alphasearch.gridnetai.com` (Your custom domain) ← **ADD THIS**

### 3. Alternative: Use Firebase CLI

```bash
# List current authorized domains
firebase auth:export domains.json --project alpha-search-index

# The domains should include alphasearch.gridnetai.com
```

## Why This Happens:

Firebase OAuth (Google Sign-In) requires explicit authorization of domains for security. When you:
- Deploy to Firebase Hosting → `*.web.app` and `*.firebaseapp.com` are auto-authorized
- Add a custom domain → You must manually authorize it

## After Adding the Domain:

1. Wait 1-2 minutes for changes to propagate
2. Clear browser cache or use incognito mode
3. Try signing in again on `alphasearch.gridnetai.com`
4. Sign-in should work without errors

## Testing:

```bash
# Test on each domain:
# ✅ http://localhost:5000 (local dev)
# ✅ https://alpha-search-index.web.app (Firebase default)
# ✅ https://alphasearch.gridnetai.com (custom domain)
```

All three should work after adding the custom domain.
