import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { heroStore } from "./heroStore.js";

const server = new McpServer({
  name: "mlbb-hero-data",
  version: "1.2.0"
});

// Tool: get_hero_list
server.tool(
  "get_hero_list",
  "Returns a list of all hero names and IDs for autocomplete",
  {},
  async () => {
    if (!heroStore.initialized) await heroStore.init();
    const heroes = Array.from(heroStore.heroMap.values()).map(h => ({
      hero_id: h.hero_id,
      numeric_id: h.numeric_id,
      name: h.name,
      role: h.role,
      lane: h.lane,
      win_rate: h.win_rate,
      ban_rate: h.ban_rate
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(heroes) }],
    };
  }
);

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
    const counters = await heroStore.getCountersDetailed(hero_id);
    
    if (counters.length === 0) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "No counters found or hero not found" }) }],
        isError: true,
      };
    }

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
  { 
    hero_ids: z.array(z.string()).describe("Array of hero IDs"),
    assignments: z.array(z.object({
      hero_id: z.string(),
      role: z.string().optional(),
      lane: z.string().optional()
    })).optional().describe("Manual role/lane assignments")
  },
  async ({ hero_ids, assignments = [] }) => {
    if (!heroStore.initialized) await heroStore.init();
    
    const heroes = hero_ids.map(id => {
      const base = heroStore.getById(id);
      if (!base) return null;
      
      const assignment = assignments.find(a => a.hero_id === id);
      return {
        ...base,
        role: assignment?.role ? [assignment.role] : base.role,
        lane: assignment?.lane ? [assignment.lane] : base.lane
      };
    }).filter(Boolean);

    const score = { total: 0, flags: [] };

    if (heroes.length === 0) {
      return { content: [{ type: "text", text: JSON.stringify({ total: 0, flags: ["No heroes selected"] }) }] };
    }

    const hasPhysical = heroes.some(h => h.damage_type === "Physical");
    const hasMagic    = heroes.some(h => h.damage_type === "Magic");
    if (hasPhysical && hasMagic) { score.total += 35; } 
    else { score.flags.push("⚠️ One-sided damage — enemy can build one resistance type"); }

    const hasFrontline = heroes.some(h => h.role.some(r => r.includes("Tank") || r.includes("Fighter")));
    if (hasFrontline) { score.total += 35; }
    else { score.flags.push("⚠️ No frontline — team is fragile against divers"); }

    const uniqueRoles = new Set(heroes.flatMap(h => h.role));
    if (uniqueRoles.size >= 3) { score.total += 30; }
    else { score.flags.push("⚠️ Low role diversity — restricted utility in teamfights"); }

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
