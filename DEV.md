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
