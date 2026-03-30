/**
 * Ban Suggestion Engine
 * Recommends heroes to ban based on enemy picks and common high-threat counters 
 * to the suggested allied picks.
 */
const heroCache = new Map();

export async function suggestBans(enemyPicks, alliedPicks, alliedBans, enemyBans, mcpClient) {
  const banWeights = {};
  
  const cleanEnemy = enemyPicks.filter(id => id && id.trim() !== "");
  const cleanAllied = alliedPicks.filter(id => id && id.trim() !== "");
  const cleanABans = alliedBans.filter(id => id && id.trim() !== "");
  const cleanEBans = enemyBans.filter(id => id && id.trim() !== "");
  
  const alreadyPickedOrBanned = new Set([...cleanEnemy, ...cleanAllied, ...cleanABans, ...cleanEBans]);

  // 1. Fetch full hero list for meta scoring
  const listResult = await mcpClient.callTool("get_hero_list", {});
  const allHeroes = JSON.parse(listResult.content[0].text);
  const maxBR = Math.max(...allHeroes.map(h => h.ban_rate || 0)) || 1;
  const maxWR = Math.max(...allHeroes.map(h => h.win_rate || 0)) || 1;

  // 2. Parallel threat analysis for current allied picks (Threat Signal)
  const results = await Promise.all(cleanAllied.map(async (alliedId) => {
    if (heroCache.has(alliedId)) return { alliedId, counters: heroCache.get(alliedId) };
    try {
      const result = await mcpClient.callTool("get_counters", { hero_id: alliedId });
      if (result.isError) return { alliedId, counters: [] };
      const counters = JSON.parse(result.content[0].text);
      heroCache.set(alliedId, counters);
      return { alliedId, counters };
    } catch (err) {
      console.error(`Error fetching counters for allied ${alliedId}:`, err);
      return { alliedId, counters: [] };
    }
  }));

  // Initial scoring based on "Threat to Allies"
  for (const { alliedId, counters } of results) {
    for (const entry of counters) {
      if (!entry.hero || !entry.hero.hero_id) continue;
      const hId = entry.hero.hero_id;
      if (alreadyPickedOrBanned.has(hId)) continue;
      
      if (!banWeights[hId]) {
        banWeights[hId] = {
          hero: entry.hero,
          threat: 0,
          metaStrength: 0
        };
      }
      const delta = entry.increase_win_rate || 0.01;
      banWeights[hId].threat += (delta * 100);
    }
  }

  // 3. Composite Ban Score (CBS) calculation
  const compositeScores = allHeroes
    .filter(h => !alreadyPickedOrBanned.has(h.hero_id))
    .map(h => {
      const threat = banWeights[h.hero_id]?.threat || 0;
      const metaStrength = 0.5 * ((h.ban_rate || 0) / maxBR) + 0.5 * ((h.win_rate || 0.5) / maxWR);
      const cbs = 0.6 * Math.min(threat, 10) + 0.4 * (metaStrength * 10);
      
      const isPriority = metaStrength > 0.85;
      
      return { 
        ...h, 
        cbs, 
        isPriority,
        reason: isPriority ? "Priority Meta Ban" : (threat > 0 ? `Direct counter (+${threat.toFixed(1)}% threat)` : "Global threat")
      };
    });

  return compositeScores
    .sort((a, b) => b.cbs - a.cbs)
    .slice(0, 5)
    .map(s => ({
      hero_id: s.hero_id,
      name: s.name,
      lane: s.lane,
      reason: s.reason
    }));
}
