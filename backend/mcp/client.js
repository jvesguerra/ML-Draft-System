import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve to the local MCP server in the mcp-server/ directory
const serverPath = path.resolve(__dirname, "../../mcp-server/index.js");

class McpBridge {
  constructor() {
    this.client = null;
    this.transport = null;
  }

  async connect() {
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
   * Tool Names: get_hero_stats, get_counters, get_synergies, get_team_score
   */
  async callTool(name, args) {
    if (!this.client) await this.connect();
    return await this.client.callTool({ name, arguments: args });
  }
}

export const mcpBridge = new McpBridge();
