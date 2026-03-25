/**
 * Counter Picking Engine
 * Aggregates counter data across all enemy picks and identifies 
 * heroes that overlap as counters to multiple enemies.
 */
export async function suggestCounters(enemyPicks, alliedPicks, mcpClient) {
  const counterMap = {};
  const alreadyPicked = new Set([...enemyPicks, ...alliedPicks]);

  for (const enemyId of enemyPicks) {
    try {
      // Call MCP Tool: get_counters
      const result = await mcpClient.callTool("get_counters", { hero_id: enemyId });
      if (result.isError) continue;
      
      const counters = JSON.parse(result.content[0].text);
      
      for (const entry of counters) {
        const hId = entry.hero.hero_id;
        if (alreadyPicked.has(hId)) continue;
        
        if (!counterMap[hId]) {
          counterMap[hId] = {
            hero: entry.hero,
            count: 0,
            reasons: []
          };
        }
        
        counterMap[hId].count += 1;
        counterMap[hId].reasons.push(`Counters ${enemyId}: ${entry.reason}`);
      }
    } catch (err) {
      console.error(`Engine error fetching counters for ${enemyId}:`, err);
    }
  }

  // Sort by count (overlap) then by name
  return Object.values(counterMap)
    .sort((a, b) => b.count - a.count || a.hero.name.localeCompare(b.hero.name))
    .slice(0, 10); // Return top 10 candidates
}
