/**
 * Team Composition Engine
 * Evaluates the allied lineup against 5 critical pillars.
 */
export async function evaluateComposition(alliedHeroIds, assignments, mcpClient) {
  if (alliedHeroIds.length === 0) return { total: 0, flags: ["No heroes selected"] };

  try {
    // 1. Fetch detailed stats for all allied heroes
    const results = await Promise.all(alliedHeroIds.map(async (id) => {
      const statsRes = await mcpClient.callTool("get_hero_stats", { hero_id: id });
      if (statsRes.isError) return null;
      const data = JSON.parse(statsRes.content[0].text);
      const assignment = (assignments || []).find(a => a.hero_id === id);
      return {
        ...data,
        role: assignment?.role ? [assignment.role] : data.role,
        lane: assignment?.lane ? [assignment.lane] : data.lane
      };
    }));

    const heroes = results.filter(Boolean);
    const score = { total: 0, pillars: {}, flags: [] };

    // P1: Lane Coverage (20 pts)
    const lanes = new Set(heroes.flatMap(h => h.lane || []));
    const requiredLanes = ["Gold", "EXP", "Mid", "Jungle", "Roam"];
    const uniqueLanesFilled = requiredLanes.filter(l => lanes.has(l)).length;
    score.pillars.P1 = 20 * (uniqueLanesFilled / 5);
    if (uniqueLanesFilled < 5) score.flags.push(`⚠️ Missing lanes: ${requiredLanes.filter(l => !lanes.has(l)).join(", ")}`);

    // P2: Role Balance (20 pts)
    const roleCounts = {};
    heroes.flatMap(h => h.role).forEach(r => roleCounts[r] = (roleCounts[r] || 0) + 1);
    const idealRoles = ["Tank", "Fighter", "Mage", "Marksman", "Support"];
    const roleStats = idealRoles.map(r => Math.abs((roleCounts[r] || 0) - 1));
    const roleDeviation = roleStats.reduce((a, b) => a + b, 0);
    score.pillars.P2 = Math.max(0, 20 - (roleDeviation * 4));

    // P3: Damage Balance (20 pts)
    const physical = heroes.filter(h => h.damage_type === "Physical").length;
    const magic = heroes.filter(h => h.damage_type === "Magic").length;
    const magicRatio = heroes.length > 0 ? magic / heroes.length : 0;
    const balance = 1 - Math.abs(magicRatio - 0.4); // Ideal 40% magic
    score.pillars.P3 = 20 * balance;
    if (magicRatio === 0) score.flags.push("⚠️ Fully Physical — vulnerable to armor");
    if (magicRatio === 1) score.flags.push("⚠️ Fully Magic — vulnerable to magic resist");

    // P4: CC Presence (20 pts)
    // Heuristic: Supp/Tank/Mage contribute more to CC
    const ccWeight = heroes.reduce((acc, h) => {
      if (h.role.some(r => ["Tank", "Support", "Mage"].includes(r))) return acc + 1;
      return acc + 0.3;
    }, 0);
    score.pillars.P4 = Math.min(20, (ccWeight / 3) * 20);
    if (ccWeight < 2) score.flags.push("⚠️ Low CC — harder to secure kills");

    // P5: Power Curve (20 pts)
    // Heuristic: Assassin/Early, Mage/Mid, Marksman/Late
    const early = heroes.filter(h => h.role.includes("Assassin")).length;
    const late = heroes.filter(h => h.role.includes("Marksman")).length;
    const mid = heroes.length - early - late;
    const imbalance = Math.max(early, mid, late) - Math.min(early, mid, late);
    score.pillars.P5 = Math.max(0, 20 - (imbalance * 5));

    score.total = Math.round(score.pillars.P1 + score.pillars.P2 + score.pillars.P3 + score.pillars.P4 + score.pillars.P5);
    
    return score;
  } catch (err) {
    console.error("Composition engine error:", err);
    return { total: 0, flags: ["Error in scoring logic"] };
  }
}
