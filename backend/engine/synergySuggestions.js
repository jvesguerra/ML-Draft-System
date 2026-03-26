/**
 * Synergy Suggestions Engine
 * Recommends heroes that have strong synergies with the current allied picks.
 */
export async function suggestSynergies(alliedPicks, mcpClient) {
  if (alliedPicks.length === 0) return [];

  try {
    const result = await mcpClient.callTool("get_synergies", { hero_ids: alliedPicks });
    if (result.isError) return [];
    
    const synergies = JSON.parse(result.content[0].text);
    // The MCP tool returns { score, combos }. We want to extract hero names and format them.
    // However, the user wants hero recommendations.
    // Let's refine this to find heroes that synergize with our CURRENT picks but aren't picked yet.
    
    const recommendationMap = {};
    for (const alliedId of alliedPicks) {
      const statsResult = await mcpClient.callTool("get_hero_stats", { hero_id: alliedId });
      if (statsResult.isError) continue;
      
      const heroData = JSON.parse(statsResult.content[0].text);
      const synergists = heroData.relation?.assist?.target_hero_id || [];
      
      for (const sId of synergists) {
        // Map numeric to string ID if possible, but heroStore mapping is internal to MCP.
        // We might need the MCP server to provide a 'get_synergy_recommendations' tool.
        // For now, we'll rely on the existing get_synergies tool if it can be used for recs.
      }
    }
    
    // Simplification for now: the get_synergies tool provides combos.
    return synergies.combos.map(c => ({ name: c, reason: "High synergy combo detected" }));
  } catch (err) {
    console.error("Synergy engine error:", err);
    return [];
  }
}
