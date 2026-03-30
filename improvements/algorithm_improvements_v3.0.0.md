# MLBB Draft Assistant — Algorithm Improvement Guide

---

## Overview

This document provides a deep analysis of the four core engine files (`counterPick.js`, `banSuggestions.js`, `synergySuggestions.js`, `teamComposition.js`) and proposes concrete algorithmic improvements with formulas, scoring models, and implementation strategies.

---

## 1. `counterPick.js` — Counter Picking Engine

### Current Behavior

The engine loops over each enemy pick, calls `get_counters` per enemy, and accumulates a `count` (how many enemies a hero counters). Heroes are sorted by `count` descending.

### Problems

- **Flat counting ignores counter strength.** A hero that barely counters 3 enemies is ranked the same as one that hard-counters 3 enemies. There is no weight for *how strongly* a hero counters.
- **No win-rate integration.** The engine ignores `increase_win_rate` data available from the API (`/heroes/{id}/counters` → `sub_hero[].increase_win_rate`). This is the most reliable signal of counter strength.
- **No role/lane filtering.** A counter pick that fills a lane your team already has 2 heroes in is not actually a good pick.
- **No "counter synergy" check.** The top counter might itself be countered by another existing enemy.

### Proposed Improvement: Weighted Counter Score (WCS)

Instead of a flat `count`, compute a **Weighted Counter Score** for each candidate:

```
WCS(hero) = Σ [ win_rate_delta(hero, enemy_i) × enemy_threat(enemy_i) ] 
            for each enemy_i that hero counters
```

Where:

- `win_rate_delta(hero, enemy_i)` = the `increase_win_rate` value from the API for this matchup (e.g., `+3.5` means the counter hero wins 3.5% more when facing this enemy). Normalize to `[0, 1]` range.
- `enemy_threat(enemy_i)` = a threat multiplier for that enemy based on their pick rate and win rate:

```
enemy_threat(enemy_i) = (pick_rate × win_rate) / normalization_constant
```

A simpler version that avoids needing pick/win rate data per enemy:

```
WCS(hero) = Σ [ win_rate_delta(hero, enemy_i) ] × coverage_bonus(hero)
```

```
coverage_bonus(hero) = 1 + (0.2 × enemies_countered_count)
```

This gives a 20% bonus per additional enemy countered, rewarding multi-counter picks.

### Lane Penalty

After scoring, apply a **lane saturation penalty**:

```
final_score(hero) = WCS(hero) × (1 - lane_saturation_penalty)

lane_saturation_penalty = (heroes_already_in_same_lane / 5) × 0.5
```

For example: if your team already has 2 Gold laners, a Gold lane counter gets a 20% penalty.

### Updated Sorting Formula

```
rank = final_score(hero) DESC, then name ASC on tie
```

### Code Sketch

```javascript
for (const entry of counters) {
  const hId = entry.hero.hero_id;
  const delta = entry.increase_win_rate ?? 1.0; // fallback if missing
  const coverageBonus = 1 + (0.2 * (counterMap[hId]?.count ?? 0));
  const score = delta * coverageBonus;

  counterMap[hId].wcs = (counterMap[hId].wcs ?? 0) + score;
  counterMap[hId].count += 1;
}

// Apply lane penalty during final sort
.sort((a, b) => {
  const penaltyA = laneSaturation(a.hero.lane, alliedLanes) * 0.5;
  const penaltyB = laneSaturation(b.hero.lane, alliedLanes) * 0.5;
  return (b.wcs * (1 - penaltyB)) - (a.wcs * (1 - penaltyA));
})
```

---

## 2. `banSuggestions.js` — Ban Suggestion Engine

### Current Behavior

The engine finds heroes that counter allied picks and assigns a flat `+2` weight to each. It only looks at threats to allied heroes — it never looks at the enemy team's strongest heroes (which should also be ban candidates).

### Problems

- **Only defensive bans considered.** The engine never suggests banning high-threat enemy heroes (by win rate / ban rate), only heroes that counter your own picks.
- **Flat `+2` weight ignores counter strength.** Same issue as `counterPick.js` — no `increase_win_rate` integration.
- **No "priority ban" tier.** Some heroes are so universally strong they should always appear in ban recommendations regardless of matchup.
- **Ban overlap not handled.** If a hero is already likely to be banned by the enemy (`enemyBans`), no adjustment is made.

### Proposed Improvement: Composite Ban Score (CBS)

A ban candidate's score should combine two signals:

```
CBS(hero) = α × threat_to_allies(hero) + β × hero_meta_strength(hero)
```

Where:
- `α = 0.6` (higher weight for heroes directly threatening our picks)
- `β = 0.4` (weight for overall meta power)
- `threat_to_allies(hero)` = sum of `increase_win_rate` values for each allied hero this hero counters
- `hero_meta_strength(hero)` = normalized composite of ban rate and win rate from `/heroes/rank`:

```
meta_strength(hero) = 0.5 × (ban_rate / max_ban_rate) + 0.5 × (win_rate / max_win_rate)
```

### Priority Ban Tier

Maintain a simple threshold: if `meta_strength(hero) > 0.85`, flag as a **Priority Ban** regardless of CBS rank. These are "must-ban" meta heroes.

### Updated Weight Formula

Replace flat `+2` with:

```javascript
const delta = entry.increase_win_rate ?? 1.0;
banWeights[hId].weight += delta * 0.6; // Weighted threat contribution
```

Then at sort time, mix in meta strength:

```javascript
.sort((a, b) => {
  const cbsA = 0.6 * a.threat + 0.4 * a.metaStrength;
  const cbsB = 0.6 * b.threat + 0.4 * b.metaStrength;
  return cbsB - cbsA;
})
```

### Ban Phase Awareness

If implementing multi-round ban phases, track the ban phase number and adjust `α`/`β`:

| Ban Phase | α (Threat) | β (Meta) | Strategy |
|-----------|-----------|---------|----------|
| Phase 1   | 0.3       | 0.7     | Ban global meta threats |
| Phase 2   | 0.7       | 0.3     | Ban direct counters to your picks |

---

## 3. `synergySuggestions.js` — Synergy Suggestions Engine

### Current Behavior

The engine calls `get_synergies` with all allied hero IDs and returns `combos` (a list of combo name strings). It does not return actual hero recommendations — just label strings like `"Kagura + Atlas"`. The inner `recommendationMap` logic was started but never completed (the `for` loop body is empty).

### Problems

- **Returns combo labels, not hero objects.** The output is useless for a pick UI that needs hero IDs.
- **No per-hero synergy scoring.** It doesn't identify which individual hero would *most improve* the current team's synergy.
- **No "missing role" awareness.** The synergy pick should also consider what roles the team still needs.
- **The `recommendationMap` loop is a dead stub.** It loops over `synergists` but never writes to `recommendationMap`.

### Proposed Improvement: Synergy Gain Score (SGS)

For each candidate hero not yet picked, compute how much they improve the team's synergy:

```
SGS(candidate) = Σ [ increase_win_rate(candidate, allied_i) ] 
                 for each allied_i where candidate is in allied_i's assist list
```

A higher SGS means the candidate synergizes with more allied heroes.

Normalize for clarity:

```
normalized_SGS(candidate) = SGS(candidate) / current_ally_count
```

### Role Bonus

Add a role-fill bonus to prioritize synergy picks that also fill a missing lane/role:

```
final_synergy_score(candidate) = SGS(candidate) × (1 + role_fill_bonus)

role_fill_bonus = 0.3   if candidate fills a currently missing lane
role_fill_bonus = 0.15  if candidate fills a currently underrepresented role
role_fill_bonus = 0.0   otherwise
```

### Fixed Implementation Sketch

```javascript
export async function suggestSynergies(alliedPicks, alliedLanes, mcpClient) {
  if (alliedPicks.length === 0) return [];

  const synMap = {};

  for (const alliedId of alliedPicks) {
    const statsResult = await mcpClient.callTool("get_hero_stats", { hero_id: alliedId });
    if (statsResult.isError) continue;

    const heroData = JSON.parse(statsResult.content[0].text);
    const synergists = heroData.relation?.assist?.target_hero_id ?? [];

    for (const sId of synergists) {
      if (alliedPicks.includes(sId)) continue;
      if (!synMap[sId]) synMap[sId] = { hero_id: sId, sgs: 0, combos: [] };
      
      const delta = heroData.relation.assist.increase_win_rate?.[sId] ?? 1.0;
      synMap[sId].sgs += delta;
      synMap[sId].combos.push(`${alliedId} + ${sId}`);
    }
  }

  return Object.values(synMap)
    .map(entry => ({
      ...entry,
      sgs: entry.sgs / alliedPicks.length, // normalize
      reason: `Synergizes with: ${entry.combos.join(", ")}`
    }))
    .sort((a, b) => b.sgs - a.sgs)
    .slice(0, 10);
}
```

---

## 4. `teamComposition.js` — Team Composition Engine

### Current Behavior

The engine calls `get_team_score` (an MCP tool) and simply returns the result. There is no local logic — it is a pure passthrough. The scoring logic lives entirely in the MCP server, making it a black box from the client's perspective.

### Problems

- **Zero transparency.** The returned `flags` array is a set of pre-written strings with no numerical breakdown. The user sees `"⚠️ Missing lane: Jungle"` but not *how much* this hurts the score.
- **No incremental scoring.** You can't ask "how much better would my score be if I added X?"
- **No damage type balance formula.** The flag `"One-sided damage"` is binary — it doesn't score how one-sided it is.
- **No tankiness metric.** A team of 5 squishies should score worse than a team with 1–2 tanks, but this is not modeled explicitly.

### Proposed Improvement: Five-Pillar Scoring Model

Break the total score into 5 independently-scored pillars, each worth 20 points (max 100):

```
total = P1 + P2 + P3 + P4 + P5
```

| Pillar | Weight | What it Measures |
|--------|--------|-----------------|
| P1 — Lane Coverage | 20 | Are all 5 lanes filled? |
| P2 — Role Balance | 20 | Tank / Fighter / Mage / Marksman / Support mix |
| P3 — Damage Balance | 20 | Physical vs Magic ratio |
| P4 — CC Presence | 20 | Crowd control diversity |
| P5 — Power Curve | 20 | Early / Mid / Late balance |

### P1 — Lane Coverage Formula

```
P1 = 20 × (unique_lanes_filled / 5)
```

Where unique lanes = {Exp, Gold, Mid, Jungle, Roam} (5 total).

```
// Example: 4 lanes filled → P1 = 16
P1 = 20 × (4/5) = 16
```

### P2 — Role Balance Formula

Ideal MLBB team has exactly 1 Tank, 1 Fighter, 1 Mage, 1 Marksman, 1 Support (or close equivalent). Score based on deviation:

```
role_deviation = Σ |actual_count(role_i) - ideal_count(role_i)|
P2 = max(0, 20 - (role_deviation × 4))
```

A perfect 5-role team: `role_deviation = 0 → P2 = 20`.
A team with 3 Mages and no Tank: `role_deviation = 4 → P2 = 4`.

### P3 — Damage Balance Formula

```
magic_ratio = magic_heroes / total_heroes
physical_ratio = physical_heroes / total_heroes

balance = 1 - |magic_ratio - 0.4|   // ideal is ~40% magic, 60% physical
P3 = 20 × balance
```

This means a 2M/3P split scores higher than 0M/5P (fully physical), which is exploitable.

### P4 — CC Presence Formula

```
cc_score = min(unique_cc_types / 3, 1.0)   // cap at 3 unique CC types
P4 = 20 × cc_score
```

Example CC types: stun, slow, knock-up, suppress, freeze. At least 3 different types = full score.

### P5 — Power Curve Formula

```
early = heroes with power_stage == "Early"
mid   = heroes with power_stage == "Mid"
late  = heroes with power_stage == "Late"

// Penalize lopsided power curve
imbalance = max(early, mid, late) - min(early, mid, late)
P5 = max(0, 20 - (imbalance × 5))
```

A balanced 2/2/1 spread: `imbalance = 1 → P5 = 15`.
A full early-game team (5/0/0): `imbalance = 5 → P5 = 0`.

### Incremental Score Delta

To answer "how much better does adding hero X make my score?", compute:

```
delta(hero_X) = evaluate_composition([...current_allies, hero_X]) - evaluate_composition(current_allies)
```

This allows synergy and counter pick suggestions to be ranked not just by matchup, but also by composition improvement.

---

## 5. Cross-Engine Improvements

### Unified Candidate Score

For the final pick recommendation, combine scores from all three engines into a single **Unified Draft Score (UDS)**:

```
UDS(hero) = w1 × WCS(hero)           // Counter value
          + w2 × SGS(hero)            // Synergy value
          + w3 × composition_delta(hero)  // Composition improvement
          - w4 × ban_risk(hero)       // Penalize if enemy might ban it

// Recommended weights:
w1 = 0.40
w2 = 0.30
w3 = 0.20
w4 = 0.10
```

### Caching & Performance

All four engines call the MCP `get_counters` and `get_hero_stats` tools in loops — this is `O(n)` async API calls per render. At 5 enemy picks, that's 5 separate network requests just for counter data.

**Recommended:** Add a `heroCache` Map at the module level and check it before calling the MCP:

```javascript
const heroCache = new Map();

async function getCachedCounters(hero_id, mcpClient) {
  if (heroCache.has(hero_id)) return heroCache.get(hero_id);
  const result = await mcpClient.callTool("get_counters", { hero_id });
  const parsed = JSON.parse(result.content[0].text);
  heroCache.set(hero_id, parsed);
  return parsed;
}
```

Also consider **parallelizing** with `Promise.all` instead of sequential `for` loops:

```javascript
// Before (sequential — slow):
for (const enemyId of cleanEnemy) {
  const result = await mcpClient.callTool("get_counters", { hero_id: enemyId });
  ...
}

// After (parallel — fast):
const results = await Promise.all(
  cleanEnemy.map(id => mcpClient.callTool("get_counters", { hero_id: id }))
);
```

---

## Summary Table

| Engine | Key Problem | Core Formula Added | Expected Improvement |
|--------|-------------|-------------------|---------------------|
| `counterPick.js` | Flat count ignores counter strength | Weighted Counter Score (WCS) with `increase_win_rate` | Better matchup relevance |
| `banSuggestions.js` | Only defensive, no meta awareness | Composite Ban Score (CBS) with α/β mix | Catches global threats |
| `synergySuggestions.js` | Dead stub, returns labels not heroes | Synergy Gain Score (SGS) per candidate | Actually usable hero recs |
| `teamComposition.js` | Opaque black box, no breakdown | Five-Pillar Scoring (P1–P5) with formulas | Transparent, improvable scores |
| All engines | Sequential API calls, no cache | `Promise.all` + `heroCache` Map | Significant speed gains |
