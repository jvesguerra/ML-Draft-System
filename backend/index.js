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
app.get("/health", (req, res) => {
  res.json({ status: "ok", port: PORT });
});

// Root
app.get("/", (req, res) => {
  res.send("MLBB Draft System Backend API (External-API-Proxied) is running.");
});

async function bootstrap() {
  try {
    console.log("Bootstrapping backend and connecting to MCP...");
    await mcpBridge.connect();
    
    app.listen(PORT, () => {
      console.log(`Backend Server listening at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start backend:", err);
    process.exit(1);
  }
}

bootstrap();
