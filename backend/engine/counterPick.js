/**
 * Counter Picking Engine
 * Aggregates counter data across all enemy picks and identifies 
 * heroes that overlap as counters to multiple enemies.
 */
const heroCache = new Map();

export async function suggestCounters(enemyPicks, alliedPicks, alliedBans, enemyBans, assignments, mcpClient) {
  const counterMap = {};
  
  // Clean input set to avoid matching empty strings or nulls
  const cleanEnemy = enemyPicks.filter(id => id && id.trim() !== "");
  const cleanAllied = alliedPicks.filter(id => id && id.trim() !== "");
  const cleanABans = alliedBans.filter(id => id && id.trim() !== "");
  const cleanEBans = enemyBans.filter(id => id && id.trim() !== "");
  
  const alreadyPicked = new Set([...cleanEnemy, ...cleanAllied, ...cleanABans, ...cleanEBans]);
  const alliedLanes = (assignments || []).map(a => a.lane).filter(Boolean);

  // Parallel fetch with caching (v3 Optimization)
  const results = await Promise.all(cleanEnemy.map(async (enemyId) => {
    if (heroCache.has(enemyId)) return { enemyId, counters: heroCache.get(enemyId) };
    try {
      const result = await mcpClient.callTool("get_counters", { hero_id: enemyId });
      if (result.isError) return { enemyId, counters: [] };
      const counters = JSON.parse(result.content[0].text);
      heroCache.set(enemyId, counters);
      return { enemyId, counters };
    } catch (err) {
      console.error(`Error fetching counters for ${enemyId}:`, err);
      return { enemyId, counters: [] };
    }
  }));

  for (const { enemyId, counters } of results) {
    for (const entry of counters) {
      // User filtering requirement: Skip unknown or incomplete hero data
      if (!entry.hero || !entry.hero.hero_id || !entry.hero.name || entry.hero.name === "Unknown") continue;
      
      const hId = entry.hero.hero_id;
      if (alreadyPicked.has(hId)) continue;
      
      if (!counterMap[hId]) {
        counterMap[hId] = {
          hero: entry.hero,
          wcs: 0,
          count: 0,
          reasons: []
        };
      }
      
      // Combined Logic: Weighted Counter Score (WCS) with Overlap (count)
      const delta = entry.increase_win_rate || 0.01;
      const coverageBonus = 1 + (0.2 * counterMap[hId].count); // Each overlap adds 20% weight
      const score = (delta * 100) * coverageBonus;

      counterMap[hId].wcs += score;
      counterMap[hId].count += 1;
      counterMap[hId].reasons.push(`Counters ${enemyId}: ${entry.reason || `+${(delta*100).toFixed(1)}% WR`}`);
    }
  }

  // Final scoring with Lane Saturation Penalty
  return Object.values(counterMap)
    .map(c => {
      const sameLaneCount = alliedLanes.filter(l => c.hero.lane?.includes(l)).length;
      const lanePenalty = (sameLaneCount / 5) * 0.5; // Up to 50% penalty if lane is full
      return { ...c, finalScore: c.wcs * (1 - lanePenalty) };
    })
    .sort((a, b) => b.finalScore - a.finalScore || a.hero.name.localeCompare(b.hero.name))
    .slice(0, 10);
}
