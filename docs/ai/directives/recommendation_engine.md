# Directive: Recommendation Engine Logic

## Goal
Explain the heuristic scoring and logic flow used by the `backend/engine/` modules to generate drafting suggestions.

## 1. Counter Selection (`counterPick.js`)
The engine uses an **Overlap Scoring** method:
1. Fetch counter list for **every** enemy hero.
2. If a hero (e.g., Lancelot) counters three different enemies, his score is high.
3. Filter out heroes already picked by either side.
4. Sort by: Overlap Score DESC > Meta Tier DESC.
5. Return top 5 suggestions.

## 2. Team Composition (`teamComposition.js`)
We delegate this to the MCP server's `get_team_score`, which evaluates:
- **Damage Split**: Presence of both Magic and Physical.
- **Frontline**: Need for at least one chunky hero (Tank/Fighter).
- **Utility**: Diversity of roles to ensure CC and supportive capabilities.
- **Power Curve**: Ensure the team isn't just full of late-game scalars who lose early.

## 3. Lane Coverage (`laneCheck.js`)
The engine maps hero roles to standard MLBB lanes:
- **Gold**: Marksman preferred.
- **EXP**: Sustain Fighter/Tank.
- **Mid**: Burst Mage.
- **Jungle**: Fast objective-taker (Assassin/Fighter).
- **Roam**: CC Tank or Heal Support.

**Strategy**: If a lane is empty (e.g., "Missing Roamer"), the API should prioritize suggestions that fit that missing role during the Allied pick phase.

## Scoring Weights
| Pillar | Weight |
|---|---|
| Lane Coverage | 40% |
| Damage Balance | 20% |
| Frontline | 20% |
| Utility/CC | 20% |
