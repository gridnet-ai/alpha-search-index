# Alpha Page — Backend wiring

## Firestore

**Collection:** `alphapages`  
**Document ID:** `{userId}` (one doc per user)

### Fields (saved from Create Alpha Page)

| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Canonical page UID (10-char) |
| `slug` | string | Human-friendly URL slug |
| `name` | string | Display name |
| `caption` | string | Bio/caption |
| `signals` | array | Links: `[{ type, label, url }]` |
| `coverDataUrl` | string | Cover image (data URL or URL) |
| `status` | string | `'draft'` or `'published'` |
| `backgroundColor` | string | Solid color hex (when `backgroundType === 'solid'`) |
| `backgroundType` | string | `'solid'` \| `'gradient'` \| `'image'` |
| `backgroundGradient` | string | CSS gradient, e.g. `linear-gradient(135deg, #a, #b)` |
| `gradientPreset` | string | Optional preset key (e.g. `blue-green`) |
| `backgroundImage` | string | Storage download URL (when type is `image`) |
| `backgroundSize` | string | `cover` \| `contain` \| `auto` (tile) |
| `backgroundPosition` | string | e.g. `center`, `top`, `bottom left` |
| `canonical_url` | string | `https://gridnetai.com/sites/{uid}` |
| `public_url` | string | `https://gridnetai.com/{slug}` |
| `grid_address` | string | `grid://{uid}` |
| `updatedAt` | timestamp | Server timestamp |

Security: `firestore.rules` allows read/write only when `request.auth.uid == userId`.

---

## Firebase Storage (GCP bucket)

Alpha page assets (e.g. background images) use **Firebase Storage’s default bucket**.

- **Default bucket:** Created when you enable Storage in the [Firebase Console](https://console.firebase.google.com) → Project → Build → Storage → Get started.
- **Path:** `alphapages/{userId}/background_{timestamp}_{filename}` — one object per upload; download URL is stored in Firestore `backgroundImage`.

No separate GCP bucket creation is required; the default bucket is used.

### Rules

`storage.rules` allows authenticated users to read/write only under their own path:

- `alphapages/{userId}/{allPaths=**}` → allow if `request.auth.uid == userId`

Deploy rules: `firebase deploy --only storage`

---

## Emulators

- Firestore: port **8085**
- Storage: port **9199** (in `firebase.json`)

Run: `firebase emulators:start --only firestore,storage,hosting` (and `functions` if needed).
