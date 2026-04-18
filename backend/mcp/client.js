import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";
import { heroStore } from "../../mcp-server/heroStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve to the local MCP server in the mcp-server/ directory
const serverPath = path.resolve(__dirname, "../../mcp-server/index.js");

class McpBridge {
  constructor() {
    this.client = null;
    this.transport = null;
    // Detect Vercel or production environment to use direct bridge
    this.isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  }

  async connect() {
    if (this.isServerless) {
      console.log("Serverless mode detected. Initializing HeroStore directly...");
      await heroStore.init();
      return;
    }

    console.log("Connecting to MCP server at:", serverPath);
    this.transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });

    this.client = new Client(
      { name: "draft-backend-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await this.client.connect(this.transport);
    console.log("Connected to MCP server.");
  }

  /**
   * Proxies calls to the underlying MCP server tools.
   * In serverless mode, calls the logic directly.
   */
  async callTool(name, args) {
    if (this.isServerless) {
      return await this.callDirect(name, args);
    }

    if (!this.client) await this.connect();
    return await this.client.callTool({ name, arguments: args });
  }

  async callDirect(name, args) {
    if (!heroStore.initialized) await heroStore.init();
    
    let resultText = "";
    let isError = false;

    switch (name) {
      case "get_hero_list":
        const heroes = Array.from(heroStore.heroMap.values()).map(h => ({
          hero_id: h.hero_id,
          numeric_id: h.numeric_id,
          name: h.name,
          role: h.role,
          lane: h.lane,
          win_rate: h.win_rate,
          ban_rate: h.ban_rate
        }));
        resultText = JSON.stringify(heroes);
        break;
      
      case "get_hero_stats":
        const hero = heroStore.getById(args.hero_id);
        if (!hero) {
          resultText = JSON.stringify({ error: "Hero not found" });
          isError = true;
        } else {
          resultText = JSON.stringify(hero);
        }
        break;

      case "get_counters":
        const counters = await heroStore.getCountersDetailed(args.hero_id);
        if (counters.length === 0) {
          resultText = JSON.stringify({ error: "No counters found or hero not found" });
          isError = true;
        } else {
          resultText = JSON.stringify(counters);
        }
        break;

      case "get_synergies":
        const synergyResult = heroStore.evaluateSynergy(args.hero_ids);
        resultText = JSON.stringify(synergyResult);
        break;

      case "get_team_score": {
        const teamHeroes = args.hero_ids.map(id => {
          const base = heroStore.getById(id);
          if (!base) return null;
          const assignment = args.assignments?.find(a => a.hero_id === id);
          return {
            ...base,
            role: assignment?.role ? [assignment.role] : base.role,
            lane: assignment?.lane ? [assignment.lane] : base.lane
          };
        }).filter(Boolean);

        const score = { total: 0, flags: [] };
        if (teamHeroes.length > 0) {
          const hasPhysical = teamHeroes.some(h => h.damage_type === "Physical");
          const hasMagic    = teamHeroes.some(h => h.damage_type === "Magic");
          if (hasPhysical && hasMagic) score.total += 35;
          else score.flags.push("⚠️ One-sided damage — enemy can build one resistance type");

          const hasFrontline = teamHeroes.some(h => h.role.some(r => r.includes("Tank") || r.includes("Fighter")));
          if (hasFrontline) score.total += 35;
          else score.flags.push("⚠️ No frontline — team is fragile against divers");

          const uniqueRoles = new Set(teamHeroes.flatMap(h => h.role));
          if (uniqueRoles.size >= 3) score.total += 30;
          else score.flags.push("⚠️ Low role diversity — restricted utility in teamfights");
        } else {
          score.total = 0;
          score.flags.push("No heroes selected");
        }
        resultText = JSON.stringify(score);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: resultText }],
      isError
    };
  }
}

export const mcpBridge = new McpBridge();
