import express from "express";
import { suggestCounters } from "../engine/counterPick.js";
import { evaluateComposition } from "../engine/teamComposition.js";
import { mcpBridge } from "../mcp/client.js";

const router = express.Router();

// GET /api/draft/recommend?enemy=layla,tigreal&allied=kagura
router.get("/recommend", async (req, res) => {
  const enemyStr = req.query.enemy || "";
  const alliedStr = req.query.allied || "";
  
  const enemyPicks = enemyStr.split(",").filter(Boolean);
  const alliedPicks = alliedStr.split(",").filter(Boolean);

  try {
    const suggestions = await suggestCounters(enemyPicks, alliedPicks, mcpBridge);
    res.json({ suggestions });
  } catch (error) {
    console.error("Draft recommendation error:", error);
    res.status(500).json({ error: "Failed to generate recommendations." });
  }
});

// GET /api/draft/composition?allied=kagura,atlas
router.get("/composition", async (req, res) => {
  const alliedStr = req.query.allied || "";
  const alliedPicks = alliedStr.split(",").filter(Boolean);

  try {
    const score = await evaluateComposition(alliedPicks, mcpBridge);
    res.json(score);
  } catch (error) {
    console.error("Composition evaluation error:", error);
    res.status(500).json({ error: "Failed to evaluate composition." });
  }
});

export default router;
