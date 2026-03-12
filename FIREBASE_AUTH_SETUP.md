# Firebase Authentication Setup

## Enable Authentication Providers

To complete the login system setup, you need to enable authentication providers in the Firebase Console:

### 1. Enable Google Sign-In

1. Go to [Firebase Console](https://console.firebase.google.com/project/alpha-search-index/authentication/providers)
2. Click on "Authentication" in the left sidebar
3. Go to the "Sign-in method" tab
4. Click on "Google" provider
5. Toggle "Enable"
6. Set the project support email (e.g., `admin@gridnetai.com`)
7. Click "Save"

### 2. Enable Email/Password Sign-In

1. In the same "Sign-in method" tab
2. Click on "Email/Password" provider
3. Toggle "Enable"
4. (Optional) Enable "Email link (passwordless sign-in)" for future enhancement
5. Click "Save"

### 3. Configure Authorized Domains

Make sure these domains are authorized:

1. Go to "Authentication" → "Settings" → "Authorized domains"
2. Ensure these are listed:
   - `localhost` (for local development)
   - `alpha-search-index.web.app` (Firebase default)
   - `alpha-search-index.firebaseapp.com` (Firebase default)
   - `alphasearch.gridnetai.com` (custom domain)

If `alphasearch.gridnetai.com` is not listed, click "Add domain" and add it.

## Features Implemented

### ✅ User Authentication
- **Google Sign-In**: One-click authentication with Google account
- **Email/Password**: Traditional email/password registration and login
- **Auth State Persistence**: Users stay logged in across sessions

### ✅ User Interface
- **Morphing Modal**: Login modal appears from top of screen with smooth animation
- **User Menu**: Avatar in top-right corner with dropdown menu
- **Account Prompt**: Appears after first search for non-logged-in users
- **Mobile Optimized**: No zoom on input focus, responsive design

### ✅ Search History
- **Automatic Saving**: All searches saved to Firestore when logged in
- **User-Specific**: Each user can only access their own history
- **Secure**: Firestore rules enforce user isolation

### ✅ Metric Updates
- Changed "AI Readiness Score" → "Alpha Search Score"
- Changed "Avg. AI Readiness Score" → "Avg. Alpha Search Score"

## Testing

### Local Testing
```bash
cd C:\alpha-search-index
firebase serve --only functions,hosting
```

Visit `http://localhost:5000` and:
1. Perform a search (URL or name)
2. See the account prompt appear
3. Click "Create Account"
4. Sign in with Google or Email/Password
5. Perform another search
6. Check that your avatar appears in top-right
7. Click avatar to see dropdown menu

### Production Testing
Visit `https://alphasearch.gridnetai.com` and follow the same steps.

## Database Structure

### `searchHistory` Collection

```javascript
{
  userId: "string",        // Firebase Auth UID
  query: "string",         // Search query (domain or name)
  type: "url" | "name",   // Type of search
  result: { ... },         // Full result data
  timestamp: Timestamp     // Server timestamp
}
```

### Security Rules

```javascript
match /searchHistory/{historyId} {
  // Users can only read their own history
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
  
  // Users can only create history with their own userId
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
  
  // Users can update/delete their own history
  allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
}
```

## Future Enhancements

### Planned Features
1. **Search History View**: Modal showing all past searches with filters
2. **AI Rank Dashboard**: Track your personal AI visibility score over time
3. **Saved Searches**: Bookmark specific searches for quick access
4. **Email Notifications**: Get alerts when your AI rank changes
5. **Social Sharing**: Share your AI rank on social media
6. **Team Accounts**: Collaborate with team members on searches

### Technical Improvements
1. **OAuth Providers**: Add GitHub, Twitter, LinkedIn sign-in
2. **Passwordless Auth**: Email magic links for easier login
3. **2FA**: Two-factor authentication for enhanced security
4. **Profile Management**: Edit display name, avatar, preferences
5. **Data Export**: Download search history as JSON/CSV

## Troubleshooting

### "auth/unauthorized-domain" Error
- Make sure `alphasearch.gridnetai.com` is added to authorized domains in Firebase Console

### "auth/popup-blocked" Error
- Browser is blocking the Google sign-in popup
- Ask user to allow popups for the site

### "auth/email-already-in-use" Error
- User trying to sign up with an email that's already registered
- Prompt them to sign in instead

### Search History Not Saving
- Check browser console for Firestore permission errors
- Verify Firestore rules are deployed: `firebase deploy --only firestore:rules`
- Ensure user is logged in: `currentUser` should not be null

## Mobile Zoom Fix

Added to viewport meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

This prevents iOS Safari from zooming in when focusing on input fields, providing a better mobile experience.

---

**Last Updated**: March 11, 2026  
**Status**: ✅ Deployed to Production  
**URL**: https://alphasearch.gridnetai.com
