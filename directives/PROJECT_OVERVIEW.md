# MLBB Drafting Assistant

## Project Overview and Objectives

- **The Problem**: Mobile Legends players make uninformed draft decisions — picking heroes without accounting for counters, team composition balance, or lane coverage — leading to avoidable losses.
- **The Goal**: Provide a real-time drafting assistant that recommends hero picks based on opponent selections, team synergy, and role coverage. The tool acts like an in-game analyst sitting next to you during draft phase.

---

## Technical Stack & Infrastructure

- **Platform**: Full-Stack JavaScript (React frontend + Node.js/Express backend). The backend serves as an MCP host that brokers hero data between the data layer and the recommendation engine.
- **MCP Layer**: A Model Context Protocol server exposes structured hero tools (`get_hero_stats`, `get_counters`, `get_synergies`) consumed by the AI recommendation engine.
- **Hosting**: Frontend on Vercel; backend and MCP server on Railway or Render. Hero metadata stored in a local JSON flat-file database (easily swappable to PostgreSQL).
- **Data Architecture**: Hero metadata (stats, tags, counters, synergies) lives in a versioned JSON schema. The MCP server reads from this store and exposes it as typed resources. Draft state is managed client-side.

---

## System Architecture

```
┌─────────────────────────────────────────────┐
│              React Frontend                 │
│  [ Allied Picks ] + [ Enemy Picks ]         │
│  [ Suggested Picks ] + [ Draft Strength ]   │
└──────────────────┬──────────────────────────┘
                   │ HTTP / WebSocket
┌──────────────────▼──────────────────────────┐
│           Node.js / Express API             │
│        Recommendation Engine Logic          │
└──────────────────┬──────────────────────────┘
                   │ MCP Tool Calls
┌──────────────────▼──────────────────────────┐
│              MCP Server                     │
│  get_hero_stats  │  get_counters            │
│  get_synergies   │  get_team_score          │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Hero Metadata Store (JSON)          │
│  heroes.json — stats, tags, counters, etc.  │
└─────────────────────────────────────────────┘
```

---

## MCP Resource Definitions

The MCP server exposes the following tools:

| Tool | Input | Output |
|---|---|---|
| `get_hero_stats` | `hero_id: string` | Hero metadata object |
| `get_counters` | `hero_id: string` | Array of counter hero IDs with reason |
| `get_synergies` | `hero_ids: string[]` | Synergy score + combo labels |
| `get_team_score` | `hero_ids: string[]` | Composition balance score |

### MCP Server — Tool Definitions (Node.js)

```javascript
// mcp-server/index.js
import { MCPServer, Tool } from "@modelcontextprotocol/sdk";
import { heroStore } from "./data/heroStore.js";

const server = new MCPServer({ name: "mlbb-hero-data", version: "1.0.0" });

server.addTool(new Tool({
  name: "get_hero_stats",
  description: "Returns full metadata for a hero by ID",
  parameters: { hero_id: { type: "string", required: true } },
  handler: async ({ hero_id }) => heroStore.getById(hero_id)
}));

server.addTool(new Tool({
  name: "get_counters",
  description: "Returns heroes that counter the given hero",
  parameters: { hero_id: { type: "string", required: true } },
  handler: async ({ hero_id }) => {
    const hero = heroStore.getById(hero_id);
    return hero.counter_ids.map(id => ({
      hero: heroStore.getById(id),
      reason: heroStore.getCounterReason(hero_id, id)
    }));
  }
}));

server.addTool(new Tool({
  name: "get_synergies",
  description: "Evaluates synergy score for a set of heroes",
  parameters: { hero_ids: { type: "array", items: { type: "string" }, required: true } },
  handler: async ({ hero_ids }) => heroStore.evaluateSynergy(hero_ids)
}));

server.start();
```

---

## Data Schema

### Hero Metadata (JSON)

```json
{
  "hero_id": "kagura",
  "name": "Kagura",
  "role": ["Mage"],
  "lane": ["Mid"],
  "damage_type": "Magic",
  "tags": ["Burst", "Mobility", "Poke"],
  "power_stage": "Mid",
  "cc_type": ["Slow", "Knock-up"],
  "counter_ids": ["lancelot", "gusion", "helcurt"],
  "countered_by_ids": ["esmeralda", "ruby", "franco"],
  "synergy_ids": ["atlas", "tigreal", "chou"],
  "stats": {
    "base_hp": 2450,
    "base_mana": 550,
    "base_physical_atk": 115,
    "base_magic_power": 0,
    "movement_speed": 260
  },
  "tier": "S",
  "patch": "1.8.72"
}
```

### Tag Reference

| Tag | Description |
|---|---|
| `Burst` | Deals large single-target or AoE damage in a short window |
| `Poke` | Safe long-range harass before committing to a fight |
| `Engage` | Initiates fights, usually with gap-close or hard CC |
| `Sustain` | Self-healing or tankiness that enables prolonged fights |
| `Peel` | Protects carries from divers and assassins |
| `Splitpush` | Strong in 1v1 side lanes |

### Power Stage Reference

| Stage | Meaning |
|---|---|
| `Early` | Dominant before level 4 / first turtle |
| `Mid` | Peaks around first lord contest |
| `Late` | Scales into a carry with items |
| `All` | Consistently strong across all stages |

---

## Drafting Logic

### 1. Counter-Picking

When the enemy picks a hero, the engine:
1. Fetches `counter_ids` for each enemy hero via `get_counters`.
2. Scores each candidate counter by how many enemy heroes it counters (overlap score).
3. Filters out already-picked heroes.
4. Returns the top 3 suggestions ranked by overlap score + tier weight.

```javascript
// engine/counterPick.js
export async function suggestCounters(enemyPicks, alliedPicks, mcpClient) {
  const counterMap = {};

  for (const enemyId of enemyPicks) {
    const counters = await mcpClient.call("get_counters", { hero_id: enemyId });
    for (const { hero } of counters) {
      if (alliedPicks.includes(hero.hero_id) || enemyPicks.includes(hero.hero_id)) continue;
      counterMap[hero.hero_id] = (counterMap[hero.hero_id] || 0) + 1;
    }
  }

  return Object.entries(counterMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => id);
}
```

### 2. Team Composition Evaluation

The engine checks the allied picks against five composition pillars:

| Pillar | Check |
|---|---|
| **Damage Split** | At least 1 Physical + 1 Magic damage source |
| **Frontline** | At least 1 Tank or Fighter in the lineup |
| **CC Chain** | Combined CC types cover at least 2 categories |
| **Power Stage** | Team has at least one Early + one Late game hero |
| **Lane Coverage** | All 5 roles covered: Gold, EXP, Mid, Jungle, Roam |

```javascript
// engine/teamComposition.js
export function evaluateComposition(heroes) {
  const score = { total: 0, flags: [] };

  const hasPhysical = heroes.some(h => h.damage_type === "Physical");
  const hasMagic    = heroes.some(h => h.damage_type === "Magic");
  if (hasPhysical && hasMagic) { score.total += 20; } 
  else { score.flags.push("⚠️ One-sided damage — enemy can build one resistance type"); }

  const hasFrontline = heroes.some(h => h.role.includes("Tank") || h.role.includes("Fighter"));
  if (hasFrontline) { score.total += 20; }
  else { score.flags.push("⚠️ No frontline — team is fragile against divers"); }

  const allCC = heroes.flatMap(h => h.cc_type || []);
  const uniqueCC = new Set(allCC);
  if (uniqueCC.size >= 2) { score.total += 20; }
  else { score.flags.push("⚠️ Weak CC chain — hard to set up kills in teamfights"); }

  const hasEarly = heroes.some(h => h.power_stage === "Early" || h.power_stage === "All");
  const hasLate  = heroes.some(h => h.power_stage === "Late"  || h.power_stage === "All");
  if (hasEarly && hasLate) { score.total += 20; }
  else { score.flags.push("⚠️ No power curve coverage — team spikes at only one stage"); }

  const lanes = new Set(heroes.flatMap(h => h.lane));
  const required = ["Gold", "EXP", "Mid", "Jungle", "Roam"];
  const missing = required.filter(l => !lanes.has(l));
  if (missing.length === 0) { score.total += 20; }
  else { score.flags.push(`⚠️ Missing lane(s): ${missing.join(", ")}`); }

  return score; // max 100
}
```

### 3. Lane Assignment Check

```javascript
// engine/laneCheck.js
const ROLE_TO_LANE = {
  "Gold":   ["Marksman", "Mage"],
  "EXP":    ["Fighter", "Tank"],
  "Mid":    ["Mage", "Assassin"],
  "Jungle": ["Assassin", "Fighter"],
  "Roam":   ["Tank", "Support"]
};

export function checkLaneCoverage(heroes) {
  const coverage = {};
  for (const [lane, roles] of Object.entries(ROLE_TO_LANE)) {
    coverage[lane] = heroes.some(h => h.role.some(r => roles.includes(r)));
  }
  return coverage;
  // e.g. { Gold: true, EXP: true, Mid: false, Jungle: true, Roam: false }
}
```

---

## User Flow

```
1. User opens Draft Assistant
        ↓
2. User inputs up to 5 Allied Hero picks (searchable dropdown)
        ↓
3. User inputs up to 5 Enemy Hero picks (searchable dropdown)
        ↓
4. On each pick → engine calls MCP → updates suggestions in real time
        ↓
5. "Suggested Picks" panel shows top 5 recommended heroes with reason tags
        ↓
6. "Draft Strength" score (0–100) shown with composition flags
        ↓
7. User can hover a suggestion to see why it's recommended
```

---

## Functional Requirements

- Input up to 5 allied and 5 enemy heroes with live search/autocomplete.
- Suggest up to 5 picks ranked by counter overlap + tier + composition need.
- Display a Draft Strength score (0–100) with breakdown by pillar.
- Flag missing lanes (e.g., "No Roamer detected").
- Flag composition imbalances (e.g., "All-physical damage").
- Auto-update suggestions after every pick change.
- Hero data patchable via `heroes.json` without code changes.

---

## Frontend Structure (React)

```jsx
// App.jsx — Minimalist draft input and output
import { useState, useEffect } from "react";
import { suggestCounters } from "./engine/counterPick";
import { evaluateComposition } from "./engine/teamComposition";
import { checkLaneCoverage } from "./engine/laneCheck";
import HeroSearch from "./components/HeroSearch";

export default function App() {
  const [allied, setAllied]       = useState([]);
  const [enemy, setEnemy]         = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [score, setScore]         = useState(null);

  useEffect(() => {
    if (allied.length === 0 && enemy.length === 0) return;
    (async () => {
      const picks = await suggestCounters(enemy, allied);
      const comp  = evaluateComposition(allied);
      const lanes = checkLaneCoverage(allied);
      setSuggestions(picks);
      setScore({ ...comp, lanes });
    })();
  }, [allied, enemy]);

  return (
    <div className="draft-board">
      <section className="team allied">
        <h2>Allied Picks</h2>
        {[0,1,2,3,4].map(i => (
          <HeroSearch key={i} value={allied[i]} onChange={h => {
            const next = [...allied]; next[i] = h; setAllied(next);
          }} />
        ))}
      </section>

      <section className="team enemy">
        <h2>Enemy Picks</h2>
        {[0,1,2,3,4].map(i => (
          <HeroSearch key={i} value={enemy[i]} onChange={h => {
            const next = [...enemy]; next[i] = h; setEnemy(next);
          }} />
        ))}
      </section>

      <section className="output">
        <h2>Suggested Picks</h2>
        <ul>
          {suggestions.map(id => <li key={id}>{id}</li>)}
        </ul>

        {score && (
          <div className="draft-score">
            <h2>Draft Strength: {score.total} / 100</h2>
            <ul>{score.flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        )}
      </section>
    </div>
  );
}
```

---

## Design & Brand Guidelines

- **Aesthetic**: Dark tactical UI — inspired by the in-game pick/ban screen. Deep navy backgrounds, gold accents, clean sans-serif typography.
- **Primary Colors**: `#1A1F2E` (background), `#FFB300` (gold accent), `#3949AB` (interactive blue), `#FFFFFF` (text).
- **Typography**: Inter or Rajdhani for headings; Inter for body. Compact and legible at small sizes.
- **Hero Cards**: Circular crop thumbnails with role icon badge. Greyed out when locked/banned.
- **Draft Strength Meter**: Horizontal progress bar, color-coded from red (0–40) → yellow (41–70) → green (71–100).

### Inspiration & References
- [ML Bang Bang Official Draft Viewer](https://www.mobilelegends.com/en/esports)
- [Moonton Hero List](https://www.mobilelegends.com/en/hero)
- [League of Graphs Champion Builder](https://www.leagueofgraphs.com) — for composition score UX reference

---

# Directive: Project Structure

## Goal
Define the standardized location for all project files in the **MLBB Drafting Assistant** full-stack application.

## Directory Mapping

### 1. Application Source Code
- **Frontend**: `frontend/` — React/Vite UI (draft board, hero search, output panels)
- **Backend**: `backend/` — Node.js/Express API (recommendation engine, MCP client bridge)
- **MCP Server**: `mcp-server/` — Standalone MCP server exposing hero data tools

### 2. Data Layer
- **Hero Metadata**: `data/heroes.json` — Versioned flat-file hero store (patchable without deploys)
- **Patch Notes**: `data/patches/` — Changelog entries per patch version

### 3. Engine Logic
- **Counter Engine**: `backend/engine/counterPick.js`
- **Composition Evaluator**: `backend/engine/teamComposition.js`
- **Lane Checker**: `backend/engine/laneCheck.js`

### 4. Automation & AI Support
- **Directives**: `directives/` — SOPs for AI agents working on this project
- **Execution Scripts**: `execution/` — Python scripts for data migrations, hero stat imports
- **Intermediate Files**: `.tmp/` — Never committed

### 5. Documentation
- **Root Docs**: `PROJECT_OVERVIEW.md`, `DEV_GUIDE.md`, `AGENTS.md`, `CLAUDE.md`

## Principles
- **Separation of Concerns**: MCP server is its own service, not bundled into the backend.
- **Data-Driven**: Hero metadata lives in JSON — no hardcoded picks, counters, or scores in logic files.
- **Directive-Driven**: Any new major feature (e.g., ban phase support, meta tier list) must be documented as a directive before implementation begins.
- **Patch-Safe**: The `heroes.json` schema is versioned so data updates never break the engine.