import { suggestCounters } from '../counterPick.js';
import { suggestBans } from '../banSuggestions.js';
import { checkLaneCoverage } from '../laneCheck.js';

// Mock MCP Client
const mockMcpClient = {
  callTool: async (name, args) => {
    if (name === "get_counters") {
      if (args.hero_id === "layla") {
        return {
          content: [{ text: JSON.stringify([
            { hero: { hero_id: "lancelot", name: "Lancelot", lane: ["Jungle"] }, reason: "Dive" },
            { hero: { hero_id: "saber", name: "Saber", lane: ["Jungle", "Mid"] }, reason: "Lock" }
          ]) }]
        };
      }
      if (args.hero_id === "kagura") {
        return {
          content: [{ text: JSON.stringify([
             { hero: { hero_id: "chou", name: "Chou", lane: ["EXP", "Roam"] } }
          ]) }]
        };
      }
    }
    return { isError: true };
  }
};

async function runTests() {
  console.log("--- Running Engine Module Tests ---");

  // Test 1: Suggest Counters
  console.log("Test 1: suggestCounters for 'layla'...");
  const suggestions = await suggestCounters(["layla"], [], [], [], mockMcpClient);
  if (suggestions.length > 0 && suggestions[0].hero.hero_id === "lancelot") {
    console.log("✅ Passed: Correctly identified counter for Layla.");
  } else {
    console.error("❌ Failed: Counter suggestion logic error.");
  }

  // Test 2: Suggest Bans
  console.log("Test 2: suggestBans highlighting 'Chou' for 'Kagura'...");
  const bans = await suggestBans([], ["kagura"], [], [], mockMcpClient);
  if (bans.length > 0 && bans[0].name === "Chou" && bans[0].lane) {
    console.log("✅ Passed: Identified Chou as a ban for Kagura with lane metadata.");
  } else {
    console.error("❌ Failed: Ban suggestion logic error.", bans);
  }

  // Test 3: Lane Check
  console.log("Test 3: checkLaneCoverage for [Miya, Atlas]...");
  const heroes = [
    { name: "Miya", role: ["Marksman"] },
    { name: "Atlas", role: ["Tank", "Support"] }
  ];
  const lanes = checkLaneCoverage(heroes);
  if (lanes.Gold === true && lanes.Roam === true && lanes.Mid === false) {
    console.log("✅ Passed: Correctly identified Gold and Roam coverage.");
  } else {
    console.error("❌ Failed: Lane check logic error.", lanes);
  }
}

runTests().catch(e => {
  console.error("Critical Test Failure:", e);
  process.exit(1);
});
