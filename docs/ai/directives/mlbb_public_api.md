# Directive: MLBB Public Data API Documentation

## Source Overview
- **Documentation**: [ridwaanhall/api-mobilelegends](https://github.com/ridwaanhall/api-mobilelegends)
- **Base URL**: `https://mlbb-stats.rone.dev/api`
- **Protocol**: RESTful JSON over HTTPS
- **Authentication**: None (Public Access)

## Core Data Architecture
The data follows a flattened structure provided by MLBB's official CMS but served through a community-maintained proxy.

### 1. Hero Roster & Relationships
**Endpoint**: `GET /heroes/positions?size=200&lang=en`
- **Purpose**: Primarily used to populate the initial roster and relationship mappings.
- **Key Data Path**: `data.records[]`
  - `data.hero_id`: Numeric ID (e.g., `25`)
  - `data.hero.data.name`: Full name (e.g., `Kagura`)
  - `data.hero.data.sortid`: Array of Roles (Mage, Fighter, etc.)
  - `data.hero.data.roadsort`: Array of Lanes (Gold, EXP, Mid, etc.)
  - `data.relation`: Critical for the Recommendation Engine.
    - `strong.target_hero_id[]`: List of numeric IDs this hero **counters**.
    - `weak.target_hero_id[]`: List of numeric IDs this hero **is countered by**.
    - `assist.target_hero_id[]`: List of numeric IDs this hero **synergizes with**.

### 2. ID Mapping Strategy
The MCP server MUST map the API's numeric IDs to internal string IDs:
- **Rule**: `lowercase`, replace spaces/hyphens with `_`, strip quotes/dots.
- **Example**: `Mobile Legends` -> `mobile_legends`, `Kagura` -> `kagura`.

## Operational Gotchas
1. **Latency**: The API can take 500ms–1500ms to respond for large lists. MCP server should cache the initial roster on boot.
2. **Missing Relations**: Some newer or less popular heroes may have empty `relation` objects.
3. **Language**: Always append `?lang=en` to ensure role/lane titles are in English for the Engine's regex/mapping logic.
4. **Lane Names**: Often appear as "Mid Lane" or "EXP Lane". The Engine expects "Mid" or "EXP".

## Usage in Project
This API is the **exclusive** data source for the Draft System. No local database is maintained. Any hero updates from the official source are automatically reflected upon the next MCP server restart.
