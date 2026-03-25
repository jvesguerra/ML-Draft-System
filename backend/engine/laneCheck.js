/**
 * Lane Assignment Checker
 * Maps hero roles to most likely lanes to ensure 5-lane coverage.
 */
const ROLE_TO_LANE = {
  "Gold":   ["Marksman", "Mage"],
  "EXP":    ["Fighter", "Tank"],
  "Mid":    ["Mage", "Assassin"],
  "Jungle": ["Assassin", "Fighter"],
  "Roam":   ["Tank", "Support", "Healer"]
};

export function checkLaneCoverage(alliedHeroes) {
  const coverage = {
    Gold: false,
    EXP: false,
    Mid: false,
    Jungle: false,
    Roam: false
  };

  alliedHeroes.forEach(hero => {
    if (!hero.role) return;
    
    // Check if hero satisfies any of the lanes
    for (const [lane, validRoles] of Object.entries(ROLE_TO_LANE)) {
      if (hero.role.some(r => validRoles.includes(r))) {
        // Simple assignment: if hero can do the lane, mark it covered
        // Note: In real matches, one hero might fulfill multiple, but here we just check if the team HAS someone for it.
        coverage[lane] = true;
      }
    }
  });

  return coverage;
}
