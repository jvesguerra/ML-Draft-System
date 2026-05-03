# Directive: MCP Server Specification

## Goal
Document the tools exposed by the MLBB MCP Server, their expected inputs/outputs, and how errors should be handled.

## Server Details
- **Location**: `mcp-server/`
- **Language**: JavaScript (Node.js) using the `@modelcontextprotocol/sdk`
- **Data Source**: Reads directly from `data/heroes.json`.

## Tools

### 1. `get_hero_stats`
**Description**: Fetch full metadata for a specific hero.
- **Input**: `{ "hero_id": "string" }`
- **Output**: JSON string representing the full hero object as defined in the data schema.
- **Error Handling**: If the ID is not found, returns an error message indicating the hero is unknown.

### 2. `get_counters`
**Description**: Returns heroes that counter the specified hero based on the `countered_by_ids` list.
- **Input**: `{ "hero_id": "string" }`
- **Output**: JSON array of objects `[{ hero: <HeroObject>, reason: "string" }]`
- **Error Handling**: If the ID is unknown, returns an error.

### 3. `get_synergies`
**Description**: Evaluates the synergy between multiple heroes.
- **Input**: `{ "hero_ids": ["string"] }`
- **Output**: JSON object with a total score and a list of identified combinations.
- **Error Handling**: Missing heroes are gracefully skipped.

### 4. `get_team_score`
**Description**: Returns composition balance score based on damage split, frontline presence, CC chain, power curve, and lane coverage.
- **Input**: `{ "hero_ids": ["string"] }`
- **Output**: JSON object `{ "total": Number, "flags": ["string"] }`
- **Error Handling**: Unknown IDs are filtered out without failing.
