# MLBB Drafting Assistant — Implementation Plan

> This document is the master execution roadmap. Agents operating on this project should read this alongside `CLAUDE.md` / `AGENTS.md` before beginning any task.

---

## Project Folder Structure

```
mlbb-drafting-assistant/
├── directives/               # Layer 1: SOPs and task instructions for AI agents
├── execution/                # Layer 3: Deterministic Python scripts
├── frontend/                 # React/Vite UI — draft board, hero search, output panels
├── backend/                  # Node.js/Express API — recommendation engine, MCP bridge
│   └── engine/               # counterPick.js, teamComposition.js, laneCheck.js
├── mcp-server/               # Standalone MCP server exposing hero data tools
├── data/
│   ├── heroes.json           # Versioned hero metadata store
│   └── patches/              # Per-patch changelog entries
├── .tmp/                     # Intermediate files — never committed
├── .env                      # API keys and environment variables
├── PROJECT_OVERVIEW.md
├── IMPLEMENTATION_PLAN.md    # (this file)
├── DEV_GUIDE.md
├── CLAUDE.md
└── AGENTS.md
```

### Directory Reference

| Directory | Layer | Purpose |
|---|---|---|
| `directives/` | Layer 1 — Directive | SOPs and goals for AI agents; living documents |
| `execution/` | Layer 3 — Execution | Deterministic Python scripts for data work |
| `frontend/` | Source Code | React/Vite UI — draft board and output panels |
| `backend/` | Source Code | Express API — recommendation engine and MCP client |
| `mcp-server/` | Source Code | Standalone MCP server exposing hero tools |
| `data/` | Data Layer | `heroes.json` flat-file store; patch changelogs |
| `.tmp/` | Intermediates | Temporary files — never committed, always regenerable |

---

## Phase Overview

| Phase | Name | Deliverable | Status |
|---|---|---|---|
| 0 | Foundation | Repo scaffold, dynamic data flow | ✅ Complete |
| 1 | MCP Server | API-Proxied MCP server with 4 tools | ✅ Complete |
| 2 | Engine | Counter, composition, and lane logic | ✅ Complete |
| 3 | Backend API | Express routes wiring engine to MCP | ✅ Complete |
| 4 | Frontend | Draft board UI with live suggestions | 🔲 Not Started |
| 5 | Integration | End-to-end flow tested and deployed | 🔲 Not Started |

---

## Phase 0 — Foundation

**Goal**: Establish the project scaffold, agent configuration, and data schema before any feature work begins.

### Tasks

- [ ] Initialize monorepo with `frontend/`, `backend/`, `mcp-server/`, `data/`, `directives/`, `execution/` directories
- [ ] Create `.env.example` with required keys (`PORT`, `MCP_SERVER_URL`, etc.)
- [ ] Create `data/heroes.json` with schema and 5 seed heroes (Kagura, Atlas, Chou, Franco, Lancelot)
- [ ] Write `CLAUDE.md` and `AGENTS.md` using the standard 3-layer architecture template
- [ ] Write `directives/data_schema.md` — defines the hero JSON schema and patch versioning rules
- [ ] Write `directives/add_hero.md` — SOP for adding or updating a hero entry

### Definition of Done
## Phase 0: Foundation ✅
- [x] Establish monorepo structure
- [x] Set up environment variables (`.env`)
- [x] Define data flow: **External API → MCP Proxy → Backend Engine → UI**
- [x] Map upstream source: [ridwaanhall/api-mobilelegends](https://github.com/ridwaanhall/api-mobilelegends) (MLBB Public Data API)

---

## Phase 1: MCP Server (API Proxy) ✅
- [x] Install `@modelcontextprotocol/sdk` in `mcp-server/`
- [x] Implement `heroStore.js` — fetches and caches live data from [MLBB Public Data API](https://mlbb-stats.rone.dev/api)
- [x] Implement `get_hero_stats` tool — returns full hero metadata (proxied from external API)
- [x] Implement `get_counters` tool — returns counter heroes mapped from external API relations
- [x] Implement `get_synergies` tool — scores a set of hero IDs for synergy
- [x] Implement `get_team_score` tool — returns composition balance score
- [x] Write `directives/mcp_server.md` — documents each tool, inputs/outputs

### Data Integrity Policy
- **Zero Local Data**: No hero stats, roles, or relations are stored in this repository.
- **Dynamic Fetching**: Every startup of the MCP server pulls the latest roster from the external API to ensure patch-accuracy.
- **Source of Truth**: All logic relies on the data schema provided by the `ridwaanhall/api-mobilelegends` documentation.

---

## Phase 2 — Recommendation Engine

**Goal**: Implement the three core drafting logic modules as testable, data-driven functions.

### Tasks

- [ ] Implement `backend/engine/counterPick.js`
- [x] Implement `backend/engine/counterPick.js`
  - Aggregates counter overlap across all enemy picks
  - Filters already-picked heroes
  - Returns top 5 by overlap score × tier weight
- [x] Implement `backend/engine/teamComposition.js`
  - Scores 5 pillars (Damage Split, Frontline, CC Chain, Power Stage, Lane Coverage)
  - Returns `{ total: 0–100, flags: string[] }`
- [x] Implement `backend/engine/laneCheck.js`
  - Maps hero roles to MLBB lanes
  - Returns `{ Gold, EXP, Mid, Jungle, Roam }` coverage object
- [x] Write unit tests for each engine module (`/backend/engine/__tests__/`)
- [x] Write `directives/recommendation_engine.md` — documents scoring weights, pillar logic, and edge cases

### Scoring Weights (v1)

| Pillar | Points | Condition |
|---|---|---|
| Damage Split | 20 | At least 1 Physical + 1 Magic source |
| Frontline | 20 | At least 1 Tank or Fighter |
| CC Chain | 20 | ≥ 2 unique CC types |
| Power Stage | 20 | At least 1 Early + 1 Late game hero |
| Lane Coverage | 20 | All 5 lanes filled |

### Definition of Done
All three modules pass unit tests with the 5 seed heroes. Engine correctly flags a 5-Marksman lineup as weak.

---

## Phase 3 — Backend API

**Goal**: Wire the recommendation engine to the MCP server through a clean Express API.

MCP Server - https://github.com/ridwaanhall/api-mobilelegends

### Tasks

- [x] Initialise `backend/package.json`
- [x] Implement `backend/mcp/client.js` — establishes connection to local MCP server
- [x] Implement `backend/routes/draft.js` — exposes `/api/recommend` and `/api/composition`
- [x] Implement `backend/index.js` — main entry point (Express.js)
- [x] Create `directives/mlbb_public_api.md` — document external API data schema and mapping.
- [x] End-to-end connectivity check (Backend -> MCP -> Remote API) list for frontend autocomplete
- [ ] Implement `GET /api/hero/:id` — returns single hero metadata
- [ ] Add request validation (Zod or Joi) on all POST routes
- [ ] Write `directives/backend_api.md` — documents all routes, payloads, and error codes

### API Contract

```
POST /api/suggest
  Body:    { allied: string[], enemy: string[] }
  Returns: { suggestions: HeroMeta[], score: { total: number, flags: string[], lanes: object } }

GET /api/heroes
  Returns: HeroMeta[]

GET /api/hero/:id
  Returns: HeroMeta
```

### Definition of Done
Postman/curl call to `POST /api/suggest` with a valid body returns ranked suggestions and a Draft Strength score.

---

## Phase 4 — Frontend

**Goal**: Build the minimalist draft board UI with live pick input, suggestions panel, and Draft Strength display.

### Tasks

- [ ] Scaffold React/Vite app in `frontend/`
- [ ] Implement `HeroSearch` component — searchable dropdown with hero avatar thumbnails
- [ ] Implement `DraftBoard` component — two columns (Allied / Enemy), 5 slots each
- [ ] Implement `SuggestedPicks` panel — top 5 recommendations with reason tags
- [ ] Implement `DraftStrengthMeter` — progress bar (0–100) with color ramp and flag list
- [ ] Implement `LaneCoverageBar` — 5-lane indicator showing filled/missing lanes
- [ ] Wire all components to `POST /api/suggest` on each pick change
- [ ] Apply design tokens (dark navy bg, gold accent, Inter/Rajdhani font)
- [ ] Write `directives/frontend_components.md` — documents component props and state contracts

### Component Tree

```
App
├── DraftBoard
│   ├── TeamColumn (allied)  →  5× HeroSearch
│   └── TeamColumn (enemy)   →  5× HeroSearch
└── OutputPanel
    ├── SuggestedPicks        →  5× HeroCard + reason tag
    ├── DraftStrengthMeter    →  score bar + flags
    └── LaneCoverageBar       →  Gold / EXP / Mid / Jungle / Roam
```

### Definition of Done
Selecting 3 enemy heroes renders at least 3 ranked suggestions and a partial Draft Strength score in the browser.

---

## Phase 5 — Data Population

**Goal**: Seed `heroes.json` with the full active MLBB roster (100+ heroes) so the tool is usable in real drafts.

### Tasks

- [ ] Write `execution/seed_heroes.py` — parses a source (wiki CSV or manual JSON) and outputs valid `heroes.json` entries
- [ ] Write `execution/validate_heroes.py` — checks every hero for required fields, valid `counter_ids` references, and schema compliance
- [ ] Write `execution/patch_update.py` — accepts a patch diff file and updates affected heroes in `heroes.json`
- [ ] Populate all heroes with at minimum: `role`, `lane`, `damage_type`, `tags`, `power_stage`, `counter_ids`, `tier`
- [ ] Create `data/patches/1.8.72.md` as the baseline patch changelog
- [ ] Write `directives/data_population.md` — documents the seeding process, source of truth, and patch update SOP

### Definition of Done
`validate_heroes.py` passes with 100+ heroes. Random sample of 10 heroes returns correct counter suggestions in the live API.

---

## Phase 6 — Integration & Deployment

**Goal**: End-to-end flow tested, deployed, and accessible via a public URL.

### Tasks

- [ ] Write `execution/smoke_test.py` — hits every API endpoint with valid and invalid payloads, asserts correct responses
- [ ] Configure Vercel deployment for `frontend/`
- [ ] Configure Railway/Render deployment for `backend/` and `mcp-server/`
- [ ] Set production environment variables in each hosting platform
- [ ] Run `smoke_test.py` against production URLs
- [ ] Write `DEV_GUIDE.md` — local setup instructions (clone → install → run)
- [ ] Update `directives/` with any production-specific edge cases discovered during deployment

### Definition of Done
Public Vercel URL loads the draft board. A full 5v5 pick scenario returns suggestions and a score ≤ 2 seconds.

---

## Agent Operating Principles

> Agents working on this project must follow the 3-layer architecture defined in `CLAUDE.md`.

**Check tools first.** Before writing any new script, check `execution/` for an existing one per the relevant directive.

**Self-anneal when things break.**
1. Read the error and stack trace
2. Fix the script
3. Test it again (pause if the fix involves paid API calls — check with user first)
4. Update the relevant directive with what was learned

**Update directives as you learn.** Directives are living documents. API limits, timing quirks, schema edge cases — all go back into the directive. Never discard learnings.

**Local files are intermediates only.** Anything in `.tmp/` is throwaway. Deliverables live in cloud services or committed source files.

---

## Key Constraints & Edge Cases

| Constraint | Detail |
|---|---|
| Hero duplicates | A hero cannot appear in both allied and enemy picks — validate at input |
| Incomplete drafts | Engine must handle 1–5 picks per side gracefully, not just full 5v5 |
| Patch drift | `heroes.json` must include a `patch` field so stale data is detectable |
| MCP server down | Backend must return a graceful error if MCP is unreachable, not a 500 crash |
| Unknown hero ID | `get_hero_stats` must return a clear error for unrecognized IDs |
| All-same-role drafts | Lane check must flag this even when all 5 heroes are filled |
