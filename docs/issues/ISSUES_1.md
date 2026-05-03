# ISSUE_1: Blank Screen on Enemy Hero Entry

## Problem Description
The application interface "goes blank" (likely a React runtime crash) when an enemy hero is entered into the draft.

## Potential Causes

### 1. Analysis Data Mismatch
When an enemy hero is added, the `updateAnalysis` function is triggered. If the backend returns data that the frontend doesn't expect (e.g., missing fields in `suggestions` or `synergySuggestions`), it can cause a crash during the mapping/rendering phase.

**Specifically:**
- If `s.hero` is undefined in `suggestions.map(...)`, accessing `s.hero.name` will crash.
- If `composition.flags` is not an array, `composition.flags.map(...)` will crash.

### 2. State Inconsistency
The `enemyPicks` array stores objects with `{ id, name }`, whereas `alliedPicks` stores `{ id, name, role, lane }`. While `HeroCard` handles this with default values (`hero.role || ""`), any logic that assumes all picks are structured identically might fail.

### 3. Component Identity (Fixed in v2.1.2)
Previously, sub-components were defined inside `App`, which could cause recreation of the entire DOM tree on every state change, leading to focus loss or intermittent crashes. This was refactored in v2.1.2, but some residual issues might remain if props are not handled correctly.

## Proposed Solutions

### 1. Defensive Rendering
Add optional chaining and null checks to all mapping functions in the render method.
```javascript
{suggestions?.map((s, i) => (
  <strong key={i}>{s?.hero?.name || "Unknown"}</strong>
))}
```

### 2. Analysis Graceful Failure
Update `updateAnalysis` to ensure the state is always set to a valid default structure even if the API response is partial or malformed.

### 3. Structural Alignment
Ensure `enemyPicks` and `alliedPicks` use a more consistent object structure to avoid conditional logic in shared components like `HeroCard`.

## Next Steps
1. Implement defensive rendering in `App.jsx`.
2. Standardize pick objects in `validateAndAdd`.
3. Add a global error boundary to prevent the "entirely blank" screen.
