# Directive: MLBB Data Schema

## Goal
Define the exact JSON schema for the hero roster, the structure of `heroes.json`, and how patches are tracked.

## 1. File Location
- **Main Roster**: `data/heroes.json`
- **Patch Notes**: `data/patches/[version].md` (e.g., `1.8.72.md`)

## 2. Global JSON Structure
The `heroes.json` file is a single flat object with a `heroes` array.
```json
{
  "heroes": [
    { /* Hero Object */ }
  ]
}
```

## 3. Hero Object Schema
All fields below are **required**.

| Field | Type | Description | Example |
|---|---|---|---|
| `hero_id` | `string` | Unique lowercase identifier (no spaces) | `"kagura"`, `"yu_zhong"` |
| `name` | `string` | Display name | `"Kagura"`, `"Yu Zhong"` |
| `role` | `string[]` | 1 or 2 official roles | `["Mage", "Assassin"]` |
| `lane` | `string[]` | Primary lanes played | `["Mid", "Gold"]` |
| `damage_type` | `string` | `Physical` or `Magic` | `"Magic"` |
| `tags` | `string[]` | Strategic tags (Burst, Pick, Sustain, etc) | `["Burst", "Mobility"]` |
| `power_stage` | `string` | `Early`, `Mid`, `Late`, or `All` | `"Mid"` |
| `cc_type` | `string[]` | Types of crowd control (Stun, Slow, etc) | `["Slow", "Knock-up"]` |
| `counter_ids` | `string[]` | IDs this hero is good against | `["lancelot", "fanny"]` |
| `countered_by_ids`| `string[]` | IDs that are good against this hero | `["chou", "khufra"]` |
| `synergy_ids` | `string[]` | IDs this hero combos well with | `["atlas", "tigreal"]` |
| `stats` | `object` | Base stats object (can be empty `{}` temporarily) | `{"base_hp": 2450}` |
| `tier` | `string` | Meta tier: `S`, `A`, `B`, `C`, `F` | `"S"` |
| `patch` | `string` | The game version when this entry was last verified | `"1.8.72"` |

## 4. Valid Enums

- **Roles**: Tank, Fighter, Assassin, Mage, Marksman, Support
- **Lanes**: Gold, EXP, Mid, Jungle, Roam
- **Tags**: Burst, Poke, Engage, Sustain, Peel, Splitpush, Pick, Immunity, Mobility
- **Stats keys**: `base_hp`, `base_mana`, `base_physical_atk`, `base_magic_power`, `movement_speed`

## 5. Patch Versioning Rules
- Every hero has a `"patch"` string.
- When an execution script updates a hero's stats based on a new patch note, it updates the `patch` string for that hero only.
- If a hero hasn't been touched in 3 major patches, a future agent might flag it as "stale."
