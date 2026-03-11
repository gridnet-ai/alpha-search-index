# Alpha Search Index — Cursor Build Prompt

**Project location:** `C:\alpha-search-index`
**Design guide:** `C:\alpha-search-index\docs\DESIGN_GUIDE.md`

---

## What We're Building

Alpha Search Index is a web app that crawls and scores any url on the internet for AI readiness. Anyone enters a URL, a real server-side crawl runs, and the result is stored publicly in Firestore.

This is the **factory** that builds the Alpha Search Index. The Alpha Search PWA queries this index. Build the factory first.

---

## Design System (Non-Negotiable)

All UI must follow the Alpha Browser Design Guide at `docs/DESIGN_GUIDE.md`.

**Key rules:**
- Background: `#e8eaf0` (search PWA variant of Grid Grey `#e0e5ec`)
- Fonts: `DM Sans` (UI) + `DM Mono` (labels, data, code)
- Shadow light: `#ffffff` — Shadow dark: `#c8cad4`
- Raised (default): `box-shadow: 6px 6px 14px #c8cad4, -6px -6px 14px #ffffff`
- Inset (pressed/input): `box-shadow: inset 4px 4px 10px #c8cad4, inset -4px -4px 10px #ffffff`
- Flat: `box-shadow: 2px 2px 6px #c8cad4, -2px -2px 6px #ffffff`
- Accent blue: `#4a8fff` — Accent green: `#34c78a` — Accent orange: `#f0704a`
- Text primary: `#1a1c2e` — Text secondary: `#5a5f7a` — Text tertiary: `#8890aa`
- All interactive elements use **reverse UZ flow**: default = raised, hover/focus = inset
- No external component libraries. Pure HTML/CSS/JS or vanilla React only.

Reference the existing UI prototype already built. The score card design, chat-style layout, check rows, grade pills, and suggestion items are already finalized — preserve them exactly.

---

## Project Structure

```
C:\alpha-search-index\
├── docs\
│   └── DESIGN_GUIDE.md
├── public\
│   ├── index.html          ← Public URL checker (already built as prototype)
├── functions\              ← Firebase Cloud Functions (Node.js)
│   ├── index.js            ← API endpoints
│   └── crawler.js          ← Core crawl logic
├── firebase.json
├── .firebaserc
└── package.json
```

---

## Part 1: Firestore Schema

Create or confirm these collections in Firestore.

### `/index/{domainId}`
```javascript
{
  domain: "stripe.com",
  alphaRankScore: 93,
  grade: "AI Native",           // "AI Native" | "AI Ready" | "Machine Ready" | "Listed" | "Not AI Ready"
  machineProfile: {
    jsonLd: true,
    llmsTxt: true,
    openApi: true,
    mcp: true,
    lastCrawled: Timestamp
  },
  verification: {
    resolves: true,
    crawlVerified: true,
    claimedByOwner: false
  },
  firstCrawled: Timestamp,
  lastCrawled: Timestamp,
  crawlCount: 1,
}
```

### `/submissions/{submissionId}`
```javascript
{
  domain: "stripe.com",
  submittedAt: Timestamp,
  status: "verified",           // "pending" | "verified" | "failed"
  }
}
```

### `/crawl_queue/{id}`
```javascript
{
  url: "stripe.com",
  source: "public" | "csv_import",
  addedAt: Timestamp,
  status: "pending" | "processing" | "done" | "failed"
}
```

---

## Part 2: Firebase Cloud Function — `/api/check`

This is the core of the entire product. Everything depends on this working correctly.

**Endpoint:** `POST /api/check`
**Request body:** `{ "url": "stripe.com" }`

### What the function does (in order):

**Step 1 — Normalize the domain**
```javascript
function normalizeDomain(input) {
  try {
    const url = input.startsWith('http') ? input : 'https://' + input;
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return input.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}
```

**Step 2 — Check Firestore for existing record**
- If domain exists in `/index/{domain}` AND was crawled within the last 24 hours → return cached result immediately with `cached: true`
- If domain exists but is older than 24 hours → re-crawl and update

**Step 3 — Run the actual crawl** (server-side HTTP fetches, never browser-side)

Fetch all four in parallel using `Promise.allSettled`:

```javascript
const base = `https://${domain}`;

const [llmsTxt, mcp, openApi, homepage] = await Promise.allSettled([
  fetch(`${base}/llms.txt`, { signal: AbortSignal.timeout(5000) }),
  fetch(`${base}/.well-known/mcp`, { signal: AbortSignal.timeout(5000) }),
  fetch(`${base}/openapi.json`, { signal: AbortSignal.timeout(5000) }),
  fetch(base, { signal: AbortSignal.timeout(8000) })
]);

const results = {
  llmsTxt: llmsTxt.status === 'fulfilled' && llmsTxt.value.ok,
  mcp: mcp.status === 'fulfilled' && mcp.value.ok,
  openApi: openApi.status === 'fulfilled' && openApi.value.ok,
  jsonLd: false  // check homepage HTML next
};
```

**Step 4 — Parse homepage for JSON-LD**
```javascript
if (homepage.status === 'fulfilled' && homepage.value.ok) {
  const html = await homepage.value.text();
  results.jsonLd = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
  results.resolves = true;
} else {
  results.resolves = false;
}
```

**Step 5 — Calculate Alpha Rank Score**
```javascript
function calcScore(r) {
  let score = 0;
  // Layer 1 — Machine Profile (50 pts max)
  if (r.jsonLd)   score += 10;
  if (r.llmsTxt)  score += 12;
  if (r.openApi)  score += 13;
  if (r.mcp)      score += 15;
  // Layer 2 — Verification (base: resolves = 8 pts)
  if (r.resolves) score += 8;
  // Remaining verification points come later (claimed, reachability history)
  return score;
}

function getGrade(score) {
  if (score >= 90) return { grade: 'AI Native',     gradeClass: 'ai-native'     };
  if (score >= 70) return { grade: 'AI Ready',      gradeClass: 'ai-ready'      };
  if (score >= 50) return { grade: 'Machine Ready', gradeClass: 'machine-ready' };
  if (score >= 30) return { grade: 'Listed',        gradeClass: 'listed'        };
  return             { grade: 'Not AI Ready',   gradeClass: 'not-ready'     };
}
```

**Step 6 — Write to Firestore `/index/{domain}`**

**Step 7 — Return response**

**Step 8 — Return response**
```javascript
res.json({
  domain,
  score,
  grade,
  gradeClass,
  machineProfile: results,
  cached: false
});
```

---

## Part 3: Public URL Checker (`public/index.html`)

The prototype is already built. **Do not redesign it.** Make these specific changes:

1. **Replace the fake `profiles` lookup table** with a real API call to `/api/check`
2. **Replace the simulated 2-second delay** with actual `fetch('POST /api/check', { url })`
3. **Show a real loading state** while the crawl runs (keep the existing typing indicator)
4. **Handle errors gracefully** — if the domain doesn't resolve, show "Domain not reachable" in the score card with score 0
5. **Add the public result to Firestore** (happens server-side automatically via the Cloud Function)
6. **Keep every pixel of the existing UI** — score card layout, check rows, grade pills, suggestion items, share button, animations — unchanged

The only change to `index.html` is replacing fake data with real API responses.

---

## Part 4: Firebase Config

: Firebase Config

### `firebase.json`
```json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "/api/**", "destination": "/api/**" }
    ]
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

### `firestore.rules`
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read on index
    match /index/{domain} {
      allow read: always;
      allow write: if false; // only Cloud Functions write
    }
    // Submissions append-only
    match /submissions/{id} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

---

## Part 5: Score Card Design Reference

The score card is already built in the prototype. Reproduce this exact HTML structure when rendering API results:

```html
<div class="score-card">
  <div class="score-header">
    <div>
      <div class="score-domain">{domain}</div>
      <div class="score-grade-pill {gradeClass}">● {grade}</div>
      <div class="crawled-badge"><div class="crawled-dot"></div>just now</div>
    </div>
    <div class="score-number">
      <div class="score-big">{score}<span>/100</span></div>
      <div class="score-label">AI Readiness Score</div>
    </div>
  </div>
  <div class="score-bar-bg">
    <div class="score-bar-fill" style="width:0%"></div>
  </div>
  <div class="breakdown-title">Machine Profile</div>
  <!-- check rows: JSON-LD, llms.txt, OpenAPI, MCP -->
  <!-- suggestions: only show missing items -->
  <div class="card-actions">
    <button class="card-btn">↗ Share Score</button>
    <button class="card-btn">✦ Claim Listing</button>
  </div>
</div>
```

Grade pill classes:
- `ai-native` → green
- `ai-ready` → blue
- `machine-ready` → purple
- `listed` → orange
- `not-ready` → red

---

## Implementation Order

Build in this exact sequence:

1. `functions/crawler.js` — the crawl logic (normalization, 4 parallel fetches, JSON-LD parse)
2. `functions/index.js` — the `/api/check` Cloud Function endpoint
3. Firestore schema setup (collections + rules)
4. `public/index.html` — wire real API to existing prototype (minimal changes)

---

## What NOT to Do

- Do not redesign the existing UI — only wire real data to it
- Do not use any CSS frameworks (Tailwind, Bootstrap, etc.)
- Do not use any UI component libraries (shadcn, MUI, etc.)
- Do not add model provider branding anywhere
- Do not fetch from the browser directly — all HTTP crawls run server-side only
- Do not store API keys in client-side code
- Do not change the score formula — the Alpha Rank scoring is locked
- Do not add authentication to the public checker — it must be zero-friction

---

## Key Numbers (Locked)

```
Score weights:
  JSON-LD present     → +10 pts
  llms.txt present    → +12 pts
  OpenAPI present     → +13 pts
  MCP endpoint live   → +15 pts
  Domain resolves     → +8 pts
  (Max from crawl: 58 pts — verification + engagement layers add rest)

Grade thresholds:
  90–100 → AI Native
  70–89  → AI Ready
  50–69  → Machine Ready
  30–49  → Listed
  0–29   → Not AI Ready

```

---

## Context

This is Alpha Search Index — the data factory for the Alpha Search engine. Every URL check seeds a public index of the machine web (llms.txt, JSON-LD, OpenAPI, MCP endpoints). The public index is the product. Freshness is the moat. This is infrastructure for the AI era — the S&P for the machine web.

Product family:
- **Alpha Search Index** (this project) — the factory
- **Alpha Search** — queries the index (search.gridnetai.com)
- **Alpha Browser** — desktop app powered by Alpha Search
- **Gridnet** — the infrastructure layer (gridnetai.com)
