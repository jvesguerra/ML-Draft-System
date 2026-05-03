# Directive: MLBB External API Data Source

## Base URL
`https://mlbb-stats.rone.dev/api`

## Core Data Schema (Common Wrapper)
Most endpoints return a standard wrapper:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "records": [ ... ],
    "total": 123
  }
}
```

---

## 1. GET `/heroes` — List Heroes
Returns a paginated list of heroes with basic metadata and relationship IDs.
- **Key Fields**:
  - `records[].data.hero_id`: (Integer/String) Unique identifier.
  - `records[].data.hero.data.name`: (String) Hero name.
  - `records[].data.relation`: (Object) Contains `assist`, `strong`, `weak` objects with `target_hero_id` (Array).

## 2. GET `/heroes/rank` — Hero Rank Statistics
Returns performance metrics (pick, ban, win rates) filtered by rank.
- **Key Fields**:
  - `records[].data.main_heroid`: (Integer/String) Unique identifier.
  - `records[].data.main_hero.data.name`: (String) Hero name.
  - `records[].data.main_hero_appearance_rate`: (Number) Pick rate %.
  - `records[].data.main_hero_ban_rate`: (Number) Ban rate %.
  - `records[].data.main_hero_win_rate`: (Number) Win rate %.

## 3. GET `/heroes/positions` — Hero Position Filters
Returns heroes filtered by roles and lanes.
- **Key Fields**:
  - `records[].data.hero_id`: (Integer/String) Unique identifier.
  - `records[].data.hero.data.name`: (String) Hero name.
  - `records[].data.hero.data.roadsort`: (Array) Lane metadata (e.g., "Mid Lane").
  - `records[].data.hero.data.sortid`: (Array) Role metadata (e.g., "Mage").
  - `records[].data.relation`: (Object) Synergy/Counter IDs.

## 4. GET `/heroes/{hero_identifier}` — Hero Detail
Comprehensive data including lore, skills, and base attributes.
- **Key Fields**:
  - `records[].data.hero.data.name`: (String) Hero name.
  - `records[].data.hero.data.story`: (String) Hero lore.
  - `records[].data.hero.data.heroskilllist`: (Array) Detailed skill objects.
  - `records[].data.relation`: (Object) Detailed relationship descriptions.

## 5. GET `/heroes/{hero_identifier}/stats` — Hero Detail Statistics
Deep performance analytics, including win rates by match duration.
- **Key Fields**:
  - `records[].data.main_hero_appearance_rate`: (Number) Pick rate.
  - `records[].data.sub_hero`: (Array) Synergetic heroes with `increase_win_rate`.
  - `records[].data.sub_hero_last`: (Array) Heroes with negative synergy.

## 6. GET `/heroes/{hero_identifier}/skill-combos` — Hero Skill Combos
Recommended skill sequences.
- **Key Fields**:
  - `records[].caption`: (String) Scenario label (e.g., "Teamfight").
  - `records[].data.title`: (String) Combo name.
  - `records[].data.skill_id`: (Array) Sequence of skill IDs.

## 7. GET `/heroes/{hero_identifier}/trends` — Hero Performance Trends
Historical performance timeline.
- **Key Fields**:
  - `records[].data.win_rate`: (Array) Objects containing `date`, `app_rate`, `ban_rate`, `win_rate`.

## 8. GET `/heroes/{hero_identifier}/relations` — Hero Relations
Simplified view of synergies and counters.
- **Key Fields**:
  - `records[].data.hero_id`: (Integer/String) Unique identifier.
  - `records[].data.relation`: (Object) `assist`, `strong`, `weak` mappings.

## 9. GET `/heroes/{hero_identifier}/counters` — Hero Counters
Detailed data on heroes that effectively counter the target.
- **Key Fields**:
  - `records[].data.sub_hero`: (Array) List of counters with `increase_win_rate`.
  - `records[].data.sub_hero_last`: (Array) Heroes weak against this target.

## 10. GET `/heroes/{hero_identifier}/compatibility` — Hero Compatibility
Data on which heroes synergize best.
- **Key Fields**:
  - `records[].data.sub_hero`: (Array) Compatible heroes with `increase_win_rate`.
  - `records[].data.sub_hero_last`: (Array) Incompatible heroes.
