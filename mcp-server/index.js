import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { heroStore } from "./heroStore.js";

const server = new McpServer({
  name: "mlbb-hero-data",
  version: "1.1.0"
});

// Tool: get_hero_stats
server.tool(
  "get_hero_stats",
  "Returns full metadata for a hero by ID",
  { hero_id: z.string().describe("The ID of the hero") },
  async ({ hero_id }) => {
    if (!heroStore.initialized) await heroStore.init();
    const hero = heroStore.getById(hero_id);
    if (!hero) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Hero not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(hero) }],
    };
  }
);

// Tool: get_counters
server.tool(
  "get_counters",
  "Returns heroes that counter the given hero",
  { hero_id: z.string().describe("The ID of the hero to find counters for") },
  async ({ hero_id }) => {
    if (!heroStore.initialized) await heroStore.init();
    const hero = heroStore.getById(hero_id);
    if (!hero) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Hero not found" }) }],
        isError: true,
      };
    }
    
    // Weak against = we get counters
    const weakIds = hero.relation?.weak?.target_hero_id || [];
    const counters = weakIds.map(nId => {
      const targetStrId = heroStore.numericToId.get(nId);
      const counterHero = heroStore.getById(targetStrId);
      return {
        hero: counterHero || { hero_id: targetStrId || nId.toString(), error: "Details not found" },
        reason: heroStore.getCounterReason(hero_id, targetStrId)
      };
    });

    return {
      content: [{ type: "text", text: JSON.stringify(counters) }],
    };
  }
);

// Tool: get_synergies
server.tool(
  "get_synergies",
  "Evaluates synergy score for a set of heroes",
  { hero_ids: z.array(z.string()).describe("Array of hero IDs") },
  async ({ hero_ids }) => {
    if (!heroStore.initialized) await heroStore.init();
    const result = heroStore.evaluateSynergy(hero_ids);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }
);

// Tool: get_team_score
server.tool(
  "get_team_score",
  "Returns composition balance score",
  { hero_ids: z.array(z.string()).describe("Array of hero IDs") },
  async ({ hero_ids }) => {
    if (!heroStore.initialized) await heroStore.init();
    const heroes = hero_ids.map(id => heroStore.getById(id)).filter(Boolean);
    const score = { total: 0, flags: [] };

    if (heroes.length === 0) {
      return { content: [{ type: "text", text: JSON.stringify({ total: 0, flags: ["No heroes selected"] }) }] };
    }

    const hasPhysical = heroes.some(h => h.damage_type === "Physical");
    const hasMagic    = heroes.some(h => h.damage_type === "Magic");
    if (hasPhysical && hasMagic) { score.total += 20; } 
    else { score.flags.push("⚠️ One-sided damage — enemy can build one resistance type"); }

    const hasFrontline = heroes.some(h => h.role.includes("Tank") || h.role.includes("Fighter"));
    if (hasFrontline) { score.total += 20; }
    else { score.flags.push("⚠️ No frontline — team is fragile against divers"); }

    // Unique Roles count as CC/Utility diversity in this simple version
    const uniqueRoles = new Set(heroes.flatMap(h => h.role));
    if (uniqueRoles.size >= 3) { score.total += 20; }
    else { score.flags.push("⚠️ Low role diversity — restricted utility in teamfights"); }

    // Multi-lane coverage
    const lanes = new Set(heroes.flatMap(h => h.lane || []));
    const required = ["Gold", "EXP", "Mid", "Jungle", "Roam"];
    const missing = required.filter(l => !lanes.has(l));
    
    score.total += (Math.max(0, 5 - missing.length) / 5) * 40; // Max 40 points for lanes
    if (missing.length > 0) {
      score.flags.push(`⚠️ Missing lane(s): ${missing.join(", ")}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(score) }],
    };
  }
);

// Run the server
async function main() {
  const success = await heroStore.init();
  if (!success) {
    console.error("Critial: Failed to initialize hero data from remote API.");
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MLBB Hero Data MCP Server (API-PROXIED) running on stdio");
}

main().catch(console.error);
