/**
 * Ban Suggestion Engine
 * Recommends heroes to ban based on enemy picks and common high-threat counters 
 * to the suggested allied picks.
 */
export async function suggestBans(enemyPicks, alliedPicks, alliedBans, enemyBans, mcpClient) {
  const banWeights = {};
  
  const cleanEnemy = enemyPicks.filter(id => id && id.trim() !== "");
  const cleanAllied = alliedPicks.filter(id => id && id.trim() !== "");
  const cleanABans = alliedBans.filter(id => id && id.trim() !== "");
  const cleanEBans = enemyBans.filter(id => id && id.trim() !== "");
  
  const alreadyPickedOrBanned = new Set([...cleanEnemy, ...cleanAllied, ...cleanABans, ...cleanEBans]);

  // 1. Identify heroes that counter our current allied picks
  for (const alliedId of cleanAllied) {
    try {
      const result = await mcpClient.callTool("get_counters", { hero_id: alliedId });
      if (result.isError) continue;
      
      const counters = JSON.parse(result.content[0].text);
      for (const entry of counters) {
        if (!entry.hero || !entry.hero.hero_id) continue;
        const hId = entry.hero.hero_id;
        if (alreadyPickedOrBanned.has(hId)) continue;
        
        if (!banWeights[hId]) {
          banWeights[hId] = {
            hero: entry.hero,
            weight: 0
          };
        }
        banWeights[hId].weight += 2; // +2 for countering our current picks
      }
    } catch (err) {
      console.error(`Engine error fetching counters for allied ${alliedId}:`, err);
    }
  }

  // 2. Identify "Global Threat" heroes (could be expanded with meta data)
  // For now, we'll just sort the weights we have
  return Object.values(banWeights)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map(entry => ({ 
      hero_id: entry.hero.hero_id, 
      name: entry.hero.name,
      lane: entry.hero.lane,
      reason: "Counters your picks" 
    }));
}
