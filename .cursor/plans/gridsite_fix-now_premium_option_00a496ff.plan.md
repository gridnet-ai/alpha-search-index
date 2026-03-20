---
name: GridSite fix-now premium option
overview: "Add the option to Create a GridSite in Alpha Search and build the GridSite creation screen. The user account system (Settings: Account, Plan, Your Search Term, etc.) is already built; we only add the Create GridSite entry point(s) and the creation UI. UX bar: as simple as a TikTok post, as effective as Linktree."
todos: []
isProject: false
---

# Add Grid Sites as "Fix Now" Premium Option in Alpha Search

## Goal

- Offer **Grid Sites** as a **premium "Fix now" option** in the Alpha Search app (this repo: Firebase Hosting + Cloud Functions).
- GridSites are **AI-native sites** on Gridnet (machine files, grid address, high Alpha Score). Creating one is a paid way to "fix" low visibility when a URL scores poorly or a name has no results.
- **Indexing:** GridSites are indexed like any other URL (this app’s existing `/api/check` crawl); they should appear in **Alpha Search results** and, via public URLs and SEO, in **other search engines (e.g. Google)**. Goal: GridSites become a preferred index for both machines and humans.

**Note:** The blueprint you shared references a Next.js app (`app/gridsite/new`, `AlphaSearchScreen.tsx`, etc.). **This repo is Firebase-only** ([public/index.html](c:\alpha-search-index\public\index.html), [functions/index.js](c:\alpha-search-index\functions\index.js)). The plan below is for **alpha-search-index**: entry points here, external creator URL, and indexing via this app’s API.

---

## Current state: account system already built

The Alpha Search UI already has a full user account system. We **do not** need to build account creation, payment collection, or a dashboard from scratch.

**Existing UI (from [public/index.html](c:\alpha-search-index\public\index.html)):**

- **Settings modal** (opened via Settings in slide menu / sidebar): left nav with **General**, **Account** (profile, name, email, Sign Out), **Plan** (Free Plan, “Upgrade Plan” button, Plan Usage Limits), **Your Search Term**, **Alpha Browser**, **Resources**. Tab content for each. (~2459–2514 sidebar; ~2517+ tab panels.)
- **Sidebar / slide menu:** User profile (name, email), Searches / Alpha Search Score, “YOUR SEARCH TERM” input + Save, **SEARCH HISTORY** (empty state: “No searches yet”, “Start searching to build your history”), **Settings** button.
- **Plan:** Free Plan and “Upgrade Plan” already exist; premium/paid flow can gate or surface GridSite creation.

**Scope for this plan:** (1) **Add the option** to “Create a GridSite” in this existing UI. (2) **Build the GridSite creation screen** (the creator flow). No new account or dashboard shell required.

---

## URL and discoverability (technical context)

**Google and grid://** — Google and standard browsers only resolve **http** and **https**. The custom scheme **grid://name** is not crawlable or openable by Google or by a random user. So for the open web we **must** have an **https URL** for each GridSite.

**Supporting URL solution** — Every GridSite needs a public **https** URL (e.g. **[https://gridnetai.com/sites/yourname](https://gridnetai.com/sites/yourname)**) so that: anyone can open it in a browser, Google can index it, and we can serve machine files and SEO meta there. **grid://name** remains the Grid-native address for clients that understand the Grid Registry; the https URL is the canonical one for humans and search engines.

**DNS** — We do **not** need a new “domain name server” for the internet. For https we use normal DNS (A/CNAME) for a domain we control. Resolution of **grid://name** is done by the **Grid Registry** (e.g. 34.71.173.237:9001), which maps names to endpoints; that’s a separate service, not public DNS.

**Using gridnetai.com** — We can use **gridnetai.com** only: e.g. **[https://gridnetai.com/sites/**** or](https://gridnetai.com/sites/) /sites/. The server routes the path to the GridSite (HTML + machine files). No new domain is required. A new domain is optional (e.g. shorter URLs or branding).**

**Design for a random person** — For “a random person in the world,” the primary identity is the **https URL** (e.g. gridnetai.com/sites/yourname). **grid://name** is for Grid-aware tools (e.g. Alpha Search, Grid apps). One content, two addresses: **https** for humans and Google, **grid://** (via Registry) for the Grid. The blueprint doc should state this so implementers and creators know how GridSites are shared and discovered.

---

## 1. Add the “Create GridSite” option (existing UI)

The account system is already built. We only **add the option** to create a GridSite in the existing Settings and/or sidebar.

### 1.1 Where to add the option

- **Settings left nav (primary):** Add a new item **“GridSite”** or **“Create GridSite”** in the Settings sidebar ([public/index.html](c:\alpha-search-index\public\index.html) ~2473–2514), e.g. after “Plan” or “Resources”: `data-tab="gridsite"`, `onclick="switchSettingsTab('gridsite')"`, with an icon. Add a new tab panel `**#tab-gridsite`** in the settings main area that either (a) contains the GridSite creation screen inline, or (b) shows a short blurb and a button that opens the creation screen (separate view/modal/route).
- **Plan tab (optional):** In the Plan tab content (~2591–2648), add a link or button **“Create a GridSite”** (premium) that opens the GridSite creation flow — e.g. for users who have upgraded or as an upsell.
- **Sidebar / Search History empty state (optional):** In the “SEARCH HISTORY” section when empty (“No searches yet”, “Start searching to build your history”), add a CTA such as **“Be AI ready with a Grid Site”** or **“Create a GridSite”** that opens the creation screen or Settings → GridSite tab.

### 1.2 JS and routing

- **switchSettingsTab:** Extend to handle `'gridsite'` so the new tab panel is shown when the user clicks the new nav item.
- If the creation screen is a **separate view** (e.g. full-screen or modal), add a way to open it from the GridSite tab and from other entry points (Plan, Search History CTA, low-score/empty-state CTAs from section 3).

---

## 2. Build the GridSite creation screen

Build the **GridSite creation screen** — the UI where the user defines and publishes a GridSite. UX bar: **as simple as a TikTok post, as effective as Linktree** (one canonical URL for humans and machines).

### 2.1 Contents of the creation screen

- **Inputs (minimal):** Name (or grid address slug), short description, optional cover image, optional links (Linktree-style). Optional: entity type (shop, creator, person, business, church) or auto-detect.
- **Preview:** Live or static preview of how the GridSite will look (and/or how it will appear to machines).
- **Publish:** One “Publish” or “Create GridSite” button. On success: show the canonical URL (e.g. gridnetai.com/sites/yourname), “Live” state, and optional “Share” / “View”.
- **No long forms:** Few steps, instant feedback, optional success animation.

### 2.2 Where the screen lives

- **Option A (recommended):** The creation screen is the **content of the Settings “GridSite” tab** (a multi-step or single-view form inside `#tab-gridsite`). User opens Settings → GridSite and creates there.
- **Option B:** The creation screen is a **separate page or modal** (e.g. `#gridsite-new` or `public/gridsite.html`). The Settings “GridSite” tab and other entry points then link to or open this view.

### 2.3 Backend and registration

- On Publish, the client (or a Cloud Function) must: (1) validate input, (2) call the **Grid Registry** (e.g. `POST http://34.71.173.237:9001/registry/sites`) to register the site, (3) call this app’s `**POST /api/check`** with the new GridSite URL so it is indexed in Alpha Search. If the creator backend lives elsewhere, this app can expose a thin `**POST /api/gridsite/create`** that forwards to that service and then triggers indexing.
- **Premium gating (optional):** If GridSite creation is premium, check plan/payment (e.g. via existing Plan state or a Cloud Function) before allowing Publish; otherwise show “Upgrade Plan” or redirect to Plan tab.

### 2.4 Summary for blueprint doc

- Document that the **Create GridSite option** is added to the existing Settings (and optionally Plan, Search History). Document the **GridSite creation screen** (inputs, preview, Publish, UX bar). Document registration and indexing (`/api/check` or `/api/gridsite/create`).

---

## 3. Blueprint doc (single source of truth)

**Deliverable:** [docs/GRIDSITE_BLUEPRINT.md](c:\alpha-search-index\docs\GRIDSITE_BLUEPRINT.md)

Create a single doc that covers (and add the “existing account system” + “add option” + “creation screen” from sections 1–2):

- **What is a GridSite** — AI-native site on Gridnet: machine-readable files (gridsite.json, llms.txt, openapi.json, JSON-LD, optional MCP), grid address (`grid://name`), optional AI endpoint. Entity types (shop, creator, church, person, business). Alpha Score 0–100; GridSites typically 94–100.
- **Machine files and scoring** — Which files contribute to Alpha Score; align with existing Alpha Search scoring (see [functions/crawler.js](c:\alpha-search-index\functions\crawler.js) / grade logic).
- **Creation flow (high level)** — User fills name, description, optional media/links → creator (hosted elsewhere, e.g. gridnetai.com) generates machine files → backend saves to Grid Registry and **registers with Alpha Search Index** by calling this app’s `POST /api/check` with the GridSite URL so it gets crawled and indexed. No need to document the other app’s routes; just "creator calls Alpha Search API to index the new site."
- **Alpha Search integration (this repo)** — How "Fix now" is exposed: entry points (see below), config (creator URL, optional premium landing URL), and that indexing is done via existing `/api/check`.
- **Entry points in Alpha Search** — Where and how we add "Create GridSite" / "Fix now" in [public/index.html](c:\alpha-search-index\public\index.html) (and optionally [public/embed.html](c:\alpha-search-index\public\embed.html)).
- **URL and discoverability** — Include the technical context above: grid:// is for Grid clients only; Google and random users need https URLs (e.g. gridnetai.com/sites/…). One content, two addresses; no new DNS required; gridnetai.com is sufficient.
- **Indexing and discovery** — GridSite URLs are crawled via `POST /api/check`; they appear in URL check and name search like any other indexed domain. For Google: GridSites have public URLs and machine files; the creator/host is responsible for sitemaps and SEO so they appear in traditional search.
- **Existing account system** — Settings (Account, Plan, Your Search Term, etc.) and sidebar already exist; we add the Create GridSite option and the creation screen only. See “Current state” and section 1.
- **Premium** — "Create GridSite" can be gated by existing Plan/Upgrade flow; payment is already in the app.

Do **not** duplicate full step-by-step tutorials; reference external docs (e.g. GRIDSITE_CREATOR_README, GRIDSITE_QUICK_START) if they exist elsewhere. Keep the blueprint focused on concept, flow, and **enabling the feature in Alpha Search (this repo)**.

---

## 4. "Fix now" / "Create GridSite" entry points (UI)

All in [public/index.html](c:\alpha-search-index\public\index.html). Optionally mirror in [public/embed.html](c:\alpha-search-index\public\embed.html) if the embed is used for search.

### 4.1 Low-score CTA (URL check)

When a **URL check** returns a **low Alpha Score** (e.g. `gradeClass === 'not-ready'` or `score < 50`), add a **premium "Fix now"** action so the user can create a GridSite for that domain.

- **Where:** In `buildScoreCard()`, in the `card-actions` block (around lines 3379–3381 and 3414–3417). Add a second or third button when the score is low: e.g. "Fix now — Create GridSite (Premium)".
- **Behavior:** Link to the external GridSite creator URL with prefill, e.g. `GRIDSITE_CREATOR_URL + '?url=' + encodeURIComponent(domain)` or `?domain=`. Use a configurable base URL (see Settings below).
- **Styling:** Differentiate as premium (e.g. primary CTA style or "Premium" badge).

### 4.2 Empty state / no results (name search)

When a **name search** returns **no results** (`totalPages === 0` or error state with no results), show a CTA to create a GridSite for that name.

- **Where:** Where `buildAggregateCard` is called with `totalPages: 0` and empty `results` (e.g. around 3820–3830 for the error card, and in the success path when `data.totalPages === 0`). Add a block below the aggregate card or inside it: "No results? Create a GridSite for your business or name (Premium)."
- **Behavior:** Link to creator with prefill, e.g. `?query=` + search query (entity name).

### 4.3 Primary persistent CTA: “Be AI ready with a Grid Site” (replace “Track your searches”)

**Specific location:** The **account modal strip** that sits above the search bar (same row as the search input). In [public/index.html](c:\alpha-search-index\public\index.html):

- **Markup:** `#accountModalWrap` → `.account-modal` → `**.account-narrative`** → `**#accountNarrativeText`** (around lines 2919–2924). This is the text that currently reads **“Track your searches”**. Next to it is `**#accountCtaButton`** (Sign In button) and the account avatar.
- **Change:** Replace the default narrative text **“Track your searches”** with **“Be AI ready with a Grid Site”** so the primary persistent CTA for GridSite creation is in this high-visibility spot.
- **Behavior:**
  - **When logged out:** The narrative shows “Be AI ready with a Grid Site”; the main CTA button can remain “Sign In” (and dropdown still has History / Sign Out), **or** the primary button can become “Create GridSite” that links to the creator URL (with optional campaign param). If we keep “Sign In” as primary, add a secondary link or small “Create GridSite” next to the narrative that goes to the creator.
  - **When logged in:** Narrative can stay “Be AI ready with a Grid Site” (or switch to “Track your searches”); account dropdown (around 2932–2939) must include **“Create GridSite (Premium)”** that opens the creator URL.
- **JS:** Update any place that sets the narrative text (e.g. `accountNarrativeText.textContent` or `accountNarrativeText.innerText`). Default value should be “Be AI ready with a Grid Site” instead of “Track your searches”; see around line 2923 (initial HTML) and any `updateAccountNarrative` or similar (e.g. ~4221, 4231) so logged-in state or post-search narrative doesn’t overwrite the new default unless intended.
- **Optional:** Make the narrative text itself a link to the creator (e.g. “Be AI ready with a Grid Site” → `GRIDSITE_CREATOR_URL`) so the whole line is the CTA.

**Other persistent entry (unchanged):** In the account dropdown, add (or keep) an item **“Create GridSite (Premium)”** that opens the creator URL. This complements the above so both the strip and the dropdown surface the CTA.

---

## 5. Config and environment

- **Creator URL:** Use a configurable base URL for the GridSite creator so the same build can point to staging or production. Options:
  - Inline config in [public/index.html](c:\alpha-search-index\public\index.html), e.g. `const GRIDSITE_CREATOR_URL = 'https://gridnetai.com/gridsite/new';` or read from a small config object.
  - Or expose via a tiny endpoint (e.g. `GET /api/config` returning `{ gridsiteCreatorUrl }`) if you want to change it without redeploying static HTML.
- **Premium landing (optional):** If payment happens on a separate page, use a second URL (e.g. `GRIDSITE_PREMIUM_URL`) for "Fix now" that redirects to pricing then to the creator. Otherwise, "Fix now" can link directly to the creator and payment is handled there.

---

## 6. Indexing GridSites in Alpha Search

- **No new backend route required for indexing.** The existing `**POST /api/check`** accepts a URL and crawls it, then stores the result in the index. The **external GridSite creator** (wherever it lives) should, after publishing a new GridSite and registering it with the Grid Registry, call this app’s API to index the site, e.g.:
  - `POST https://<alpha-search-host>/api/check` with body `{ url: '<gridsite-public-url>' }` (same as any URL check).
- **Document in the blueprint:** "After creating a GridSite, the creator backend must call Alpha Search’s `/api/check` with the new GridSite URL so it is crawled and appears in Alpha Search results."
- **Optional later:** A dedicated `POST /api/gridsite/register` that accepts a GridSite URL (and optionally metadata) and internally calls the same crawl/index logic could simplify the creator integration; not required for the first version.

---

## 7. GridSites in search results and in Google

- **Alpha Search results:** Once a GridSite URL is submitted via `/api/check`, it is indexed like any other domain. It will appear in **URL check** when someone searches that URL and in **name/entity search** if the index stores and queries by entity name (existing name search behavior). No change to search logic required beyond ensuring the crawl stores the same fields (domain, score, grade, machineProfile, etc.).
- **Other search engines (Google):** GridSites have public URLs and machine files (llms.txt, JSON-LD, etc.). To appear in Google, the **host of GridSite pages** (e.g. gridnetai.com/sites/…) must do normal SEO: sitemaps, meta tags, crawlable content. The blueprint should state this; no code changes in alpha-search-index are required for Google beyond documenting the goal and who is responsible.

---

## 8. Implementation order

1. **User flow and backend** — Account creation with payment: extend signup (or add post-signup step) to collect payment (Stripe or link to external checkout); add Cloud Function(s) or external service to record payment status; gate GridSite creation on paid account if required.
2. **Dashboard** — Add dashboard view (e.g. `public/dashboard.html` or `#dashboard` in index.html): primary CTA "Build a GridSite," optional "My GridSites" list, link to Search History, account/billing. Navigation: account dropdown includes "Dashboard" that opens this view.
3. **GridSite builder in dashboard** — Implement or link "Build GridSite" from dashboard (inline flow or seamless link to creator). Aim for TikTok-simple and Linktree-effective (one canonical URL).
4. **Write [docs/GRIDSITE_BLUEPRINT.md](c:\alpha-search-index\docs\GRIDSITE_BLUEPRINT.md)** — Include user flow (account, payment, dashboard), UX bar (TikTok × Linktree), what is GridSite, machine files, creation flow, entry points, URL/discoverability, indexing, premium.
5. **Add config** — Creator URL (and optional premium URL) in [public/index.html](c:\alpha-search-index\public\index.html) (or via a small config endpoint).
6. **Low-score CTA** — In `buildScoreCard()`, when score is low, add "Fix now — Create GridSite" button linking to creator/dashboard with `?url=` or `?domain=`.
7. **Empty-state CTA** — When name search returns no results, add "Create a GridSite" CTA with `?query=` prefill (to dashboard or creator).
8. **Primary persistent CTA** — Replace “Track your searches” with “Be AI ready with a Grid Site” in `#accountNarrativeText` (and initial HTML at ~line 2923); ensure JS that sets narrative (e.g. ~4221, 4231) uses the new default. Optionally make the narrative a link to the creator or change the primary button to “Create GridSite” when appropriate. Add “Create GridSite (Premium)” to the account dropdown in [public/index.html](c:\alpha-search-index\public\index.html) (add "Dashboard" and "Create GridSite" as items).
9. **Optional:** Mirror entry points and config in [public/embed.html](c:\alpha-search-index\public\embed.html) if the embed is used for search.
10. **Document for creator** — In the blueprint (or linked doc), state that after publish, the creator must call `POST /api/check` with the GridSite URL so it is indexed and appears in Alpha Search (and that Google discovery is via the host’s SEO).

---

## 9. Out of scope for this plan

- Full Stripe/payment implementation details (plan specifies “collect payment info” and gating; implementation is in scope but PCI/security details are environment-specific).
- Implementing a full GridSite creator UI from scratch in this repo if the decision is to embed or link to an existing creator elsewhere (plan allows either; blueprint should document the choice).
- Changes to crawl/scoring logic (GridSites are just URLs to crawl; they naturally score high if they serve the right machine files).
- Sitemap or Google-specific code in this repo (handled by the GridSite host).

