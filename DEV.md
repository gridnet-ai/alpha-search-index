# Development

## Why searches don’t work on the “dev server”

Searches are **not** gated by account type or login. They fail when the **API backend isn’t running**.

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

Then open the Hosting URL (e.g. `http://localhost:5020`). URL and name searches will hit the Cloud Functions emulator and work. Logged-in or not doesn’t change this; the API uses optional auth (`attachUser`), so search works either way.

### Optional: SerpAPI for name search

Name search uses SerpAPI. If you see a backend error about “SerpAPI key not configured”, set it for the emulator (e.g. in a `.env` or `firebase functions:config:set serpapi.key="..."` and restart).

---

## Connect backend server (production)

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

4. **Optional: set production config** (e.g. SerpAPI key for name search):
   ```bash
   npx firebase functions:config:set serpapi.key="YOUR_KEY"
   npx firebase deploy --only functions
   ```
