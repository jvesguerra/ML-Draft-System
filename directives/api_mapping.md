# Directive: API Data Mapping

## Goal
Provide a clear reference for the data structures used across the backend routes and the MCP (Model Context Protocol) server.

## 1. Backend Routes (Express)
All routes are prefixed with `/api/draft`.

### `GET /recommend`
Generates counter picks, ban suggestions, and synergy recommendations.
- **Query Params**:
  - `enemy`: (string) Comma-separated hero IDs (e.g., `layla,tigreal`)
  - `allied`: (string) Comma-separated hero IDs
  - `enemyBans`: (string) Comma-separated hero IDs
  - `alliedBans`: (string) Comma-separated hero IDs
- **Response Schema**:
```json
{
  "suggestions": [
    {
      "hero": { "hero_id": "string", "name": "string", "role": ["string"], ... },
      "count": 2, // Number of enemies this hero counters
      "reasons": ["Counters layla: Layla is statistically weak against...", ...]
    }
  ],
  "suggestedBans": [...], // Same structure as suggestions
  "synergySuggestions": [...] // Same structure as suggestions
}
```

### `GET /composition`
Evaluates team composition balance and lane coverage.
- **Query Params**:
  - `allied`: (string) Comma-separated hero IDs
  - `assignments`: (JSON string) `[{"hero_id": "string", "role": "string", "lane": "string"}]`
- **Response Schema**:
```json
{
  "total": 85, // Score from 0 to 100
  "flags": [
    "⚠️ One-sided damage — enemy can build one resistance type",
    "⚠️ Missing lane(s): Jungle"
  ]
}
```

### `GET /heroes`
Returns a simplified list of heroes for the frontend autocomplete/search.
- **Response Schema**:
```json
[
  {
    "hero_id": "akane",
    "name": "Akane",
    "role": ["Mage"],
    "lane": ["Mid"]
  }
]
```

---

## 2. MCP Tools (Internal)
These tools are called by the backend via the MCP Bridge.

### `get_hero_list`
Returns all heroes with basic metadata.
- **Returns**: `[{ hero_id, name, role, lane }]`

### `get_hero_stats`
Returns full metadata for a specific hero.
- **Arguments**: `hero_id` (string)
- **Returns**: Full Hero Object (see `data_schema.md`)

### `get_counters`
Returns list of heroes that counter the target.
- **Arguments**: `hero_id` (string)
- **Returns**: 
```json
[
  {
    "hero": { "hero_id": "...", "name": "...", ... },
    "reason": "String explanation of the counter relationship"
  }
]
```

### `get_synergies`
Evaluates synergy between a set of heroes.
- **Arguments**: `hero_ids` (string[])
- **Returns**:
```json
{
  "score": 20,
  "combos": ["Kagura + Atlas", "Tigreal + Layla"]
}
```

### `get_team_score`
Calculates composition balance.
- **Arguments**: 
  - `hero_ids`: string[]
  - `assignments`: `[{ hero_id, role?, lane? }]`
- **Returns**: `{ total: number, flags: string[] }`

---

## 3. Core Data Object: Hero
Stored in `heroStore.js` and proxied from external MLBB API.

| Field | Type | Description |
|---|---|---|
| `hero_id` | `string` | Lowercase snake_case ID |
| `numeric_id` | `number` | Original API ID |
| `name` | `string` | Display name |
| `role` | `string[]` | e.g. ["Mage", "Assassin"] |
| `lane` | `string[]` | e.g. ["Mid", "Gold"] |
| `damage_type`| `string` | "Magic" or "Physical" |
| `relation` | `object` | Contains `weak`, `assist`, `hard` mappings |
| `cc_type` | `string[]` | (Placeholder) Crowd control types |
| `power_stage`| `string` | "Early", "Mid", "Late", or "All" |
