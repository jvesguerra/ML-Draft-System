/**
 * Synergy Suggestions Engine
 * Recommends heroes that have strong synergies with the current allied picks.
 */
export async function suggestSynergies(alliedPicks, assignments, mcpClient) {
  if (alliedPicks.length === 0) return [];

  const synMap = {};
  const alliedLanes = (assignments || []).map(a => a.lane).filter(Boolean);
  const alliedRoles = (assignments || []).map(a => a.role).filter(Boolean);

  try {
    // 1. Fetch full list for metadata and mapping
    const listResult = await mcpClient.callTool("get_hero_list", {});
    const heroList = JSON.parse(listResult.content[0].text);
    const numericToHero = new Map(heroList.map(h => [h.numeric_id, h]));
    
    // 2. Parallel fetch stats for all allied picks
    const alliedData = await Promise.all(alliedPicks.map(async (id) => {
      const statsRes = await mcpClient.callTool("get_hero_stats", { hero_id: id });
      return statsRes.isError ? null : { id, data: JSON.parse(statsRes.content[0].text) };
    }));

    for (const res of alliedData) {
      if (!res) continue;
      const synergistIds = res.data.relation?.assist?.target_hero_id || [];
      
      for (const sNumericId of synergistIds) {
        const candidate = numericToHero.get(sNumericId);
        if (!candidate || alliedPicks.includes(candidate.hero_id)) continue;
        
        const hId = candidate.hero_id;
        if (!synMap[hId]) {
          synMap[hId] = {
            hero: candidate,
            sgs: 0,
            synergizesWith: []
          };
        }
        
        // SGS: Synergy Gain Score
        const delta = 1.0; // Default weight as API list doesn't have synergy delta
        synMap[hId].sgs += delta;
        synMap[hId].synergizesWith.push(res.data.name);
      }
    }

    // 3. Apply Role/Lane Fill Bonus and Sort
    return Object.values(synMap)
      .map(entry => {
        let bonus = 0;
        const h = entry.hero;
        
        // Lane bonus: +30% if candidate fills a missing lane
        const isMissingLane = h.lane?.some(l => !alliedLanes.includes(l));
        if (isMissingLane) bonus += 0.3;

        // Role bonus: +15% if candidate fills a missing role
        const isMissingRole = h.role?.some(r => !alliedRoles.includes(r));
        if (isMissingRole) bonus += 0.15;

        const finalScore = (entry.sgs / alliedPicks.length) * (1 + bonus);
        
        return {
          hero_id: h.hero_id,
          name: h.name,
          lane: h.lane,
          sgs: finalScore,
          reason: `Synergizes with ${entry.synergizesWith.join(", ")}${isMissingLane ? " • Fills missing lane" : ""}`
        };
      })
      .sort((a, b) => b.sgs - a.sgs)
      .slice(0, 10);

  } catch (err) {
    console.error("Synergy engine error:", err);
    return [];
  }
}
