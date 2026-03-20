# Alpha Page — post-deploy QA checklist

Use after deploying Hosting + Cloud Functions.

## Identity & builder

- [ ] Open Alpha Page builder → Identity shows **Grid Address** `grid://{uid}` and **Web Address** as **`{base}/p/{slug}`** (default base `https://alphasearch.gridnetai.com`).
- [ ] Change slug → Web Address updates; preview **Page** tab shows public URL in the URL row.
- [ ] **Share** tab: OG-style card (cover, title, caption, domain).
- [ ] **Search** tab: green URL line + title + description.
- [ ] Publish → alert lists **Live page** URL + Grid Address.

## Content blocks

- [ ] Add Text / Chapter / Footer blocks; reorder with ↑ ↓; preview updates.
- [ ] Draft save reloads blocks; published page writes `contentBlocks` to `alphapages` and `alpha_pages_index`.

## Public shell

- [ ] Visit `https://<host>/p/<published-slug>` (same host as Firebase) → page loads from `alpha_pages_index` when `status === published`.

## Search aggregate

- [ ] Name search that matches an Alpha Page → **Alpha Pages** row shows **cover** thumbnail when `coverDataUrl` exists; else avatar; else placeholder.

## APIs

- [ ] `POST /api/check` with canonical URL still works after publish.
- [ ] `POST /api/link-preview` with a public `https` URL returns JSON metadata.

## Machine files

- [ ] AI Visibility section copy explains **live URL verification** (not generated files in-app).

## Legacy Firestore URLs

- [ ] If older docs used `https://gridnetai.com/...`, run `cd functions && node ../scripts/migrate-alpha-page-urls.js --dry-run` then `--apply`, or republish from the builder.

---

**Last updated:** 2026-03-19
