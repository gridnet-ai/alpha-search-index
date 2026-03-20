# Firebase Authentication Setup Guide

## Enable Authentication Methods

### 1. Enable Email/Password Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `alpha-search-index`
3. Navigate to **Authentication** → **Sign-in method**
4. Click **Email/Password**
5. Toggle **Enable**
6. Click **Save**

### 2. Enable Google OAuth

1. In the same **Sign-in method** tab
2. Click **Google**
3. Toggle **Enable**
4. Set **Project public-facing name**: `Alpha Search`
5. Set **Project support email**: `admin@gridnetai.com`
6. Click **Save**

### 3. Configure Authorized Domains

Ensure these domains are authorized:
- `alphasearch.gridnetai.com`
- `localhost` (for local development)

Navigate to **Authentication** → **Settings** → **Authorized domains** to verify.

## Verification

Once enabled, you can test authentication:

```javascript
// In browser console at https://alphasearch.gridnetai.com
firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
  .then(result => console.log('Signed in:', result.user))
  .catch(error => console.error('Auth error:', error));
```

## Backend Implementation

The following files have been created to support authentication:

- **`functions/auth.js`** - Middleware for token verification
  - `verifyToken()` - Requires valid token, returns 401 if missing/invalid
  - `attachUser()` - Optionally attaches user if token present
  
- **`functions/db/users.js`** - User profile management
  - `createUserProfile()` - Create/update user on first login
  - `getUserProfile()` - Fetch user data
  - `incrementSearchCount()` - Track search usage
  
- **`functions/db/searchHistory.js`** - Search history management
  - `saveSearchToHistory()` - Save search to user's history
  - `getUserSearchHistory()` - Fetch user's past searches
  - `saveAiRecord()` - Save AI Record to user's collection
  - `getUserSavedRecords()` - Fetch user's saved records

## Firestore Security Rules

Updated `firestore.rules` to include:

```
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow create: if request.auth != null && request.auth.uid == userId;
  allow update: if request.auth != null && request.auth.uid == userId;
  allow delete: if false;
  
  match /searches/{searchId} {
    allow read: if request.auth != null && request.auth.uid == userId;
    allow create: if request.auth != null && request.auth.uid == userId;
    allow update, delete: if false;
  }
  
  match /saved/{recordId} {
    allow read: if request.auth != null && request.auth.uid == userId;
    allow create: if request.auth != null && request.auth.uid == userId;
    allow delete: if request.auth != null && request.auth.uid == userId;
    allow update: if false;
  }
}
```

## Next Steps

1. Enable Email/Password and Google OAuth in Firebase Console (manual step)
2. Deploy updated Firestore rules: `firebase deploy --only firestore:rules`
3. Integrate auth middleware into API endpoints
4. Test authentication flow in production
