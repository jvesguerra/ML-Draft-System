import express from "express";
import { suggestCounters } from "../engine/counterPick.js";
import { suggestBans } from "../engine/banSuggestions.js";
import { suggestSynergies } from "../engine/synergySuggestions.js";
import { evaluateComposition } from "../engine/teamComposition.js";
import { mcpBridge } from "../mcp/client.js";

const router = express.Router();

// GET /api/draft/recommend?enemy=layla&allied=kagura&enemyBans=fanny&alliedBans=nana
router.get("/recommend", async (req, res) => {
  const enemyStr = req.query.enemy || "";
  const alliedStr = req.query.allied || "";
  const enemyBansStr = req.query.enemyBans || "";
  const alliedBansStr = req.query.alliedBans || "";
  const assignmentsStr = req.query.assignments || "[]";
  
  const enemyPicks = enemyStr.split(",").filter(Boolean);
  const alliedPicks = alliedStr.split(",").filter(Boolean);
  const enemyBans = enemyBansStr.split(",").filter(Boolean);
  const alliedBans = alliedBansStr.split(",").filter(Boolean);
  
  let assignments = [];
  try {
    assignments = JSON.parse(assignmentsStr);
  } catch (e) {
    console.error("Invalid assignments JSON in recommend", e);
  }

  try {
    const suggestions = await suggestCounters(enemyPicks, alliedPicks, alliedBans, enemyBans, assignments, mcpBridge);
    const suggestedBans = await suggestBans(enemyPicks, alliedPicks, alliedBans, enemyBans, mcpBridge);
    const synergySuggestions = await suggestSynergies(alliedPicks, assignments, mcpBridge);
    res.json({ suggestions, suggestedBans, synergySuggestions });
  } catch (error) {
    console.error("Draft recommendation error:", error);
    res.status(500).json({ error: "Failed to generate recommendations." });
  }
});

// GET /api/draft/composition?allied=kagura,atlas&assignments=[{"hero_id":"kagura","role":"Mid"}]
router.get("/composition", async (req, res) => {
  const alliedStr = req.query.allied || "";
  const assignmentsStr = req.query.assignments || "[]";
  
  const alliedPicks = alliedStr.split(",").filter(Boolean);
  let assignments = [];
  try {
    assignments = JSON.parse(assignmentsStr);
  } catch (e) {
    console.error("Invalid assignments JSON", e);
  }

  try {
    const result = await mcpBridge.callTool("get_team_score", { 
      hero_ids: alliedPicks,
      assignments: assignments 
    });
    if (result.isError) {
      return res.status(500).json({ error: "Error calling composition engine" });
    }
    res.json(JSON.parse(result.content[0].text));
  } catch (error) {
    console.error("Composition evaluation error:", error);
    res.status(500).json({ error: "Failed to evaluate composition." });
  }
});

// GET /api/draft/heroes
router.get("/heroes", async (req, res) => {
  try {
    const result = await mcpBridge.callTool("get_hero_list", {});
    res.json(JSON.parse(result.content[0].text));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hero list" });
  }
});

export default router;
