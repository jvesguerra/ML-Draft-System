# Directive: Add / Update Hero

## Goal
Standard Operating Procedure for adding a new hero to `data/heroes.json`, or updating an existing hero when a patch drops.

## Workflow: Adding a New Hero

1. **Verify ID**: the new hero's ID must be lowercase, spaces replaced with underscores (e.g., `nolan`, `cici`).
2. **Collect Data**: Gather role, lane, and tag data. If unsure about tags, refer to `directives/data_schema.md` for definitions.
3. **Determine Relationships**:
   - `counter_ids`: Who does this new hero destroy?
   - `countered_by_ids`: Who counters this new hero?
   - `synergy_ids`: Who combos best with them?
4. **Modify JSON**: Read `data/heroes.json`, add the new hero object to the `"heroes"` array.
5. **Set Patch**: Set the `"patch"` field to the current live MLBB patch version.
6. **Validate**: If `execution/validate_heroes.py` exists, run it to ensure no schema violations.

## Workflow: Updating an Existing Hero (Patch Drop)

1. Read the patch notes in `data/patches/`.
2. Determine which fields changed (usually `stats`, `tier`, or `tier` shifts changing `counter_ids`).
3. Find the hero object in `data/heroes.json`.
4. Update the values.
5. Update the hero's `"patch"` field to match the new version.

## Constraints
- **Do not guess relationships randomly**: If counter data is missing, leave the array empty `[]` rather than hallucinating stats.
- **Always update the `patch` value** when modifying an existing hero, so downstream logic knows the data is fresh.
