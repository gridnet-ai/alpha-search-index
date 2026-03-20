# Development Guide

**For admins and developers working on Alpha Search Index locally and in production.**

---

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Environment Configuration](#environment-configuration)
3. [Search Identity (UID and Session)](#search-identity-uid-and-session)
4. [Connection Checklist](#connection-checklist)
5. [Troubleshooting](#troubleshooting)
6. [Production Deployment](#production-deployment)
7. [Embed Modal (`embed.html`)](#embed-modal-embedhtml)
8. [Alpha Page public URLs](#alpha-page-public-urls-gridnetai-com-vs-this-app)

---

## Local Development Setup

### Prerequisites

- **Node.js 18+** installed
- **Firebase CLI** installed: `npm install -g firebase-tools`
- **Firebase project** linked: `firebase use alpha-search-index`

### Initial Setup

```bash
# Install root dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### Starting the Development Server

**Important:** Use the full Firebase emulator stack, not a static server:

```bash
npm run serve
```

This starts:
- **Firebase Hosting emulator** (port 5020) — serves `public/` and handles `/api/*` rewrites
- **Cloud Functions emulator** (port 5021) — runs `apiHandler` and other functions
- **Firestore emulator** (port 8085) — local database
- **Storage emulator** (port 9199) — local file storage
- **UI emulator** (port 4020) — Firebase Emulator Suite UI

Wait for: *"All emulators ready! It is now safe to connect your app."*

### Opening the App

**Use the Hosting URL from the emulator table:**
- ✅ **http://localhost:5020** or **http://127.0.0.1:5020**
- ❌ **Not** a static server on a different port
- ❌ **Not** `file://` protocol

The `/api/*` rewrites only work when the page is served by the Firebase Hosting emulator.

---

## Environment Configuration

### How `.runtimeconfig.json` Works

**The problem:** Firebase Functions config (`functions.config()`) is stored in the cloud and is **not automatically available** to local emulators. The emulators run locally and don't pull cloud config by default.

**The solution:** Create `functions/.runtimeconfig.json` to provide config values to the emulators.

**How it works:**
- `.runtimeconfig.json` in the `functions` folder makes the emulators use those values instead of fetching from the cloud.
- The code checks `process.env` first, then `functions.config()`, so the emulator will read from `.runtimeconfig.json`.
- This file is in `.gitignore` so secrets aren't committed.

### Setting Up Local Config

1. **Get your production config:**
   ```bash
   cd functions
   firebase functions:config:get
   ```

2. **Create `functions/.runtimeconfig.json`:**
   ```json
   {
     "stripe": {
       "secret": "sk_live_YOUR_STRIPE_SECRET_KEY",
       "product_pro": "prod_YOUR_PRO_PRODUCT_ID"
     },
     "serpapi": {
       "key": "YOUR_SERPAPI_KEY"
     },
     "grid": {
       "endpoint": "http://34.71.173.237:9000/grid/chat",
       "account": "YOUR_GRID_ACCOUNT_ID"
     }
   }
   ```

3. **Restart emulators:**
   ```bash
   # Stop current emulators (Ctrl+C)
   npm run serve
   ```

### Required Keys for Local Development

| Key | Purpose | Where to get it |
|-----|---------|----------------|
| `stripe.secret` | Stripe checkout sessions | [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikeys) |
| `stripe.product_pro` | Alpha Page Pro product ID | [Stripe Dashboard → Products](https://dashboard.stripe.com/products) |
| `serpapi.key` | Name search (Google results) | [SerpAPI Dashboard](https://serpapi.com/dashboard) |
| `grid.endpoint` | Gridnet chat endpoint (GCP Grid) | Default: `http://34.71.173.237:9000/grid/chat` |
| `grid.account` | Gridnet account ID for chat | Get from Gridnet admin or GCP Grid dashboard |

**Note:** `.runtimeconfig.json` is already in `.gitignore` — never commit secrets.

---

## Search Identity (UID and Session)

- **Logged in:** Every search request sends the Firebase ID token (`Authorization: Bearer …`). The backend attaches `req.user` and stores `userId` in `search_log` and in `users/{uid}/searches`. So every search is tied to the user account when they are signed in.

- **Not logged in:** The client generates a long **anonymous session id** (like a chat session in ChatGPT), stores it in `sessionStorage` for the tab, and sends it as `X-Session-Id` and in the request body for `/api/search`. The backend stores `sessionId` in `search_log` (with `userId: null`). That way you can group all searches in one anonymous "visit" and, if you add it later, offer "claim this session" when they sign in or rate-limit per session.

`/api/check` and `/api/search` both use optional auth: if the token is present and valid, the user is attached; otherwise the request still succeeds and anonymous session id is used where applicable.

## Connection checklist (search to work locally)

1. **Start the full stack** (not static):
   ```bash
   npm run serve
   ```
   Wait until the terminal shows: *"All emulators ready! It is now safe to connect your app."*

2. **Open the app at the Hosting URL only**  
   Use the URL from the emulator table, e.g. **http://127.0.0.1:5020** or **http://localhost:5020**.  
   Do **not** open the app from another server (e.g. a different port or `file://`). The `/api/*` rewrites only work when the page is served by the Firebase Hosting emulator on that port.

3. **Ports free**  
   If you see "port taken", stop any other process using that port (e.g. Firestore 8085) or stop an old emulator run. Then run `npm run serve` again.

4. **Firestore emulator**  
   The app automatically connects to the Firestore emulator at `127.0.0.1:8085` when the page is on localhost, so Firestore data matches the emulators.

If search still fails, open DevTools → Network, run a search, and check the request to `/api/check` or `/api/search`: if it returns 404, the page is not being served by the Hosting emulator (wrong URL or wrong server). If it returns 500, check the Functions emulator terminal for errors.

---

## Troubleshooting

### Search Returns 404

**Symptom:** `/api/search` or `/api/check` returns 404 in browser DevTools.

**Cause:** The page is not being served by the Firebase Hosting emulator.

**Fix:**
1. Ensure `npm run serve` is running (not `npm run serve:static`)
2. Open the app at the **Hosting URL** from the emulator table (usually `http://localhost:5020`)
3. Do not use a static server or different port

### Search Returns 500 (Internal Server Error)

**Symptom:** `/api/search` returns 500 with error message.

**Cause:** Missing configuration or backend error.

**Steps:**
1. **Check Functions emulator terminal** — the exact error will be logged there
2. **Common issues:**
   - **"SerpAPI key not configured"** → Add `serpapi.key` to `functions/.runtimeconfig.json`
   - **"Stripe secret not configured"** → Add `stripe.secret` to `functions/.runtimeconfig.json`
   - **"Grid account not configured"** or chat errors → Add `grid.account` and `grid.endpoint` to `functions/.runtimeconfig.json`
   - **Port conflict** → Stop other processes using ports 5020, 5021, 8085, 9199, 4020
3. **Restart emulators** after fixing config

### Port Already in Use

**Symptom:** `Error: Could not start Firestore Emulator, port taken.`

**Fix (Windows):**
```powershell
# Find process using port 8085
netstat -ano | findstr :8085

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

Then restart: `npm run serve`

### Firestore Emulator Not Connecting

**Symptom:** Data not saving or loading in the app.

**Check:**
1. App is on `localhost` or `127.0.0.1` (not a different hostname)
2. Firestore emulator is running (check emulator table)
3. Browser console shows: `Firestore emulator connected`

The app automatically connects to `127.0.0.1:8085` when on localhost.

---

## Why searches don't work on the "dev server"

Searches are **not** gated by account type or login. They fail when the **API backend isn't running**.

- The app calls **`/api/check`** (URL/domain) and **`/api/search`** (name search).
- Those routes are handled by Firebase **Hosting rewrites** → **Cloud Functions** (`apiHandler`).

### Two ways to run the app

| Command | What runs | Searches work? |
|--------|------------|----------------|
| **`npm run serve:static`** | Static only (`serve public -l 5020`) | **No** – no backend, so `/api/*` returns 404. |
| **`npm run serve`** | Firebase emulators (hosting + functions + Firestore) | **Yes** – rewrites send `/api/*` to the functions emulator. |

### Fix: run the full stack

```bash
npm run serve
```

Then open the Hosting URL (e.g. `http://localhost:5020`). URL and name searches will hit the Cloud Functions emulator and work. Logged-in or not doesn't change this; the API uses optional auth (`attachUser`), so search works either way.

### Optional: SerpAPI for name search

Name search uses SerpAPI. If you see a backend error about "SerpAPI key not configured", set it for the emulator (e.g. in a `.env` or `firebase functions:config:set serpapi.key="..."` and restart).

---

## Production Deployment

To run the backend in production so the live site uses `/api/check` and `/api/search`:

1. **Log in to Firebase** (if not already):
   ```bash
   npx firebase login
   ```

2. **Confirm project** (from project root):
   ```bash
   npx firebase use
   ```
   If you need to link a different project: `npx firebase use <project-id>`.

3. **Deploy hosting + functions** (backend and frontend):
   ```bash
   npm run deploy
   ```
   Or deploy only the backend: `npm run deploy:functions`. Hosting rewrites in `firebase.json` send `/api/**` to the Cloud Function `apiHandler`, so both must be deployed for search to work on the live URL.

4. **Set production config** (required for search and Stripe):
   ```bash
   # Enable legacy config commands (required until March 2026)
   firebase experiments:enable legacyRuntimeConfigCommands
   
   # Set Stripe secret
   firebase functions:config:set stripe.secret="sk_live_YOUR_KEY"
   
   # Set Stripe Pro product ID
   firebase functions:config:set stripe.product_pro="prod_YOUR_ID"
   
   # Set SerpAPI key (for name search)
   firebase functions:config:set serpapi.key="YOUR_SERPAPI_KEY"
   
   # Set Gridnet chat endpoint and account (for chat feature)
   firebase functions:config:set grid.endpoint="http://34.71.173.237:9000/grid/chat"
   firebase functions:config:set grid.account="YOUR_GRID_ACCOUNT_ID"
   
   # Deploy functions to apply config
   firebase deploy --only functions
   ```

**Note:** `functions.config()` is deprecated and will stop working in March 2026. Plan to migrate to Firebase params or environment variables before then.

---

## Embed Modal (`embed.html`)

The embed modal is a standalone, embeddable version of Alpha Search designed for corporate websites and third-party integrations.

### File Location

- **File:** `public/embed.html`
- **Production URL:** `https://alpha-search-index.web.app/embed.html` (or your custom domain)

### Features

- **Same functionality as main app:** URL checks and name searches
- **Redirects to full app:** When users interact, they're redirected to the main Alpha Search app
- **Self-contained:** Includes all necessary Firebase SDKs and styles
- **UI differences:**
  - AI Records Indexed counter is **hidden** (same as main page)
  - Footer includes links to full app and Gridnet

### How Websites Use It

Websites can embed the modal in two ways:

#### Option 1: Iframe (Recommended)

```html
<iframe 
  src="https://alpha-search-index.web.app/embed.html" 
  width="100%" 
  height="600" 
  frameborder="0"
  title="Alpha Search Widget">
</iframe>
```

#### Option 2: Direct Link

```html
<a href="https://alpha-search-index.web.app/embed.html" target="_blank">
  Try Alpha Search
</a>
```

### Update Propagation

**Important:** Updates to `embed.html` propagate automatically to all websites using it, **but only if they're loading it from your Firebase Hosting URL**.

- ✅ **If websites embed via iframe pointing to your URL:** All websites see updates immediately after you deploy
- ❌ **If websites host their own copy:** They must manually update their copy

**Best practice:** Always use the hosted URL (`https://alpha-search-index.web.app/embed.html`) rather than downloading and hosting a local copy.

### Testing Locally

The embed modal works with the Firebase emulators:

1. Start emulators: `npm run serve`
2. Open: `http://localhost:5020/embed.html`
3. Test search functionality (same as main app)

### Differences from Main App

| Feature | Main App (`index.html`) | Embed Modal (`embed.html`) |
|---------|------------------------|---------------------------|
| AI Records Counter | Hidden | Hidden |
| Redirect behavior | N/A | Redirects to main app on interaction |
| Footer links | Full navigation | Links to full app + Gridnet |
| Standalone | Yes | Yes (self-contained) |

---

## Alpha Page public URLs (default: `alphasearch.gridnetai.com`)

**Default in app:** `window.__ALPHA_PAGE_BASE_URL__` defaults to **`https://alphasearch.gridnetai.com`** (same Firebase Hosting site as `alpha-search-index.web.app`, with DNS **CNAME** `alphasearch.gridnetai.com` → `alpha-search-index.web.app`).

Published Alpha Pages store **`public_url`** and **`canonical_url`** as the same live page:

- **`https://alphasearch.gridnetai.com/p/{slug}`** (path **`/p/`** is required; Hosting rewrites `/p/**` → [`public/alpha-public.html`](public/alpha-public.html), which loads **`alpha_pages_index`** by **slug**.)

This avoids using the **apex** `gridnetai.com` or **`www.gridnetai.com`**, which may point at other projects (e.g. corporate site).

- **Legacy data:** Older docs may have `public_url` like `https://gridnetai.com/{slug}` or canonicals under `/sites/{uid}`. Run [`scripts/migrate-alpha-page-urls.js`](../scripts/migrate-alpha-page-urls.js) once, or **republish** from the builder.
- **Search results:** Discovery uses Firestore; “Open in new tab” uses **`public_url`** — it must match a URL your Hosting + DNS actually serve.

**Machine files (`jsonLd`, `llms.txt`, etc.):** The builder **verifies** via `POST /api/check` against the **live page URL** (`/p/{slug}`). Indexed docs store `machineFiles.mode: 'remote_verify'` plus null placeholders — not full generated file bodies unless you add generation + hosting.

**Link preview API:** `POST /api/link-preview` with `{ "url": "https://..." }` returns `{ title, description, thumbnail, favicon, url }` for rich cards (server-side fetch; timeouts apply).

---

## Additional Resources

- **Stripe Setup:** See `docs/STRIPE_SETUP.md`
- **Firebase Auth:** See `docs/FIREBASE_AUTH_SETUP.md`
- **Environment Variables:** See `docs/ENVIRONMENT_SETUP.md`
- **API Reference:** See `README.md` for endpoint documentation

---

**Last Updated:** March 19, 2026  
**Maintained by:** Gridnet AI
