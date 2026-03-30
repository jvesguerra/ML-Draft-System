import { suggestCounters } from '../counterPick.js';
import { suggestBans } from '../banSuggestions.js';
import { checkLaneCoverage } from '../laneCheck.js';

// Mock MCP Client
const mockMcpClient = {
  callTool: async (name, args) => {
  // 1. Identify heroes that counter our current allied picks
    if (name === "get_hero_list") {
      return {
        content: [{ text: JSON.stringify([
          { hero_id: "layla", name: "Layla", ban_rate: 0.1, win_rate: 0.5 },
          { hero_id: "kagura", name: "Kagura", ban_rate: 0.2, win_rate: 0.51 },
          { hero_id: "chou", name: "Chou", ban_rate: 0.05, win_rate: 0.49 },
          { hero_id: "lancelot", name: "Lancelot", ban_rate: 0.8, win_rate: 0.55 },
          { hero_id: "saber", name: "Saber", ban_rate: 0.3, win_rate: 0.52 }
        ]) }]
      };
    }
    if (name === "get_counters") {
      if (args.hero_id === "layla") {
        return {
          content: [{ text: JSON.stringify([
            { hero: { hero_id: "lancelot", name: "Lancelot", lane: ["Jungle"] }, increase_win_rate: 0.04 },
            { hero: { hero_id: "saber", name: "Saber", lane: ["Jungle", "Mid"] }, increase_win_rate: 0.02 }
          ]) }]
        };
      }
      if (args.hero_id === "kagura") {
        return {
          content: [{ text: JSON.stringify([
             { hero: { hero_id: "chou", name: "Chou", lane: ["EXP", "Roam"] }, increase_win_rate: 0.03 }
          ]) }]
        };
      }
    }
    return { isError: true };
  }
};

async function runTests() {
  console.log("--- Running Engine Module Tests v3.0.0 ---");

  // Test 1: Suggest Counters (WCS)
  console.log("Test 1: suggestCounters (WCS) for 'layla'...");
  const suggestions = await suggestCounters(["layla"], [], [], [], [], mockMcpClient);
  if (suggestions.length > 0 && 
      suggestions[0].hero.hero_id === "lancelot" && 
      suggestions[0].finalScore > 0) {
    console.log("✅ Passed: WCS correctly ranked Lancelot higher due to increase_win_rate.");
  } else {
    console.error("❌ Failed: WCS logic error.", suggestions);
  }

  // Test 2: Suggest Bans (CBS)
  console.log("Test 2: suggestBans (CBS) identifying global threats...");
  const bans = await suggestBans([], ["kagura"], [], [], mockMcpClient);
  // Chou is a direct counter to Kagura (+3% threat)
  // Lancelot is a global threat (Ban Rate 80%)
  if (bans.length > 0 && bans.some(b => b.name === "Lancelot") && bans.some(b => b.name === "Chou")) {
    console.log("✅ Passed: CBS correctly identified both direct threat (Chou) and global threat (Lancelot).");
  } else {
    console.error("❌ Failed: CBS logic error.", bans);
  }
}

runTests().catch(e => {
  console.error("Critical Test Failure:", e);
  process.exit(1);
});
