import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import draftRoutes from "./routes/draft.js";
import { mcpBridge } from "./mcp/client.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/draft", draftRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", port: PORT });
});

// Root
app.get("/api", (req, res) => {
  res.send("MLBB Draft System Backend API (External-API-Proxied) is running.");
});

async function init() {
  try {
    console.log("Initializing backend and connecting to MCP...");
    await mcpBridge.connect();
    
    // Only listen if not running on Vercel
    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`Backend Server listening at http://localhost:${PORT}`);
      });
    }
  } catch (err) {
    console.error("Failed to initialize backend:", err);
    if (!process.env.VERCEL) process.exit(1);
  }
}

init();

export default app;
