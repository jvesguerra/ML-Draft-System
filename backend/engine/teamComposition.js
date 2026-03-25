/**
 * Team Composition Engine
 * Evaluates the allied lineup against 5 critical pillars.
 */
export async function evaluateComposition(alliedHeroIds, mcpClient) {
  const result = await mcpClient.callTool("get_team_score", { hero_ids: alliedHeroIds });
  if (result.isError) {
    return { total: 0, flags: ["Error calling composition engine"] };
  }
  
  return JSON.parse(result.content[0].text);
}
