# Roadmap: unified LLM chat + search retrieval

**Status:** Not implemented — placeholder for product planning.

## Goal

A single conversation experience where users can run **name/URL search** (aggregate + web results) and **chat** with an LLM, with optional shared context (e.g. last results as grounding).

## Suggested building blocks

1. **Message model** — User/assistant messages; optional attachment `searchBundle` (query, aggregate, results).
2. **Backend** — Extend existing Cloud Functions or add a BFF; reuse Firebase Auth.
3. **Grid / LLM** — If using Gridnet Layer 0 chat, follow the same server-side forward pattern as Alpha Browser (`/api/utility/chat` → Grid router); do not call Grid from the browser directly.
4. **Phases** — (1) Structured search-only messages; (2) LLM summary of results; (3) full multi-turn chat with tool use.

## Related docs

- [DEV.md](./DEV.md) — API and hosting.
- Unified plan: `.cursor/plans/alpha_page_unified_roadmap.plan.md` (identity + gaps).
