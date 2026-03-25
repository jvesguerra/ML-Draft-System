import { suggestCounters } from '../counterPick.js';
import { checkLaneCoverage } from '../laneCheck.js';

// Mock MCP Client
const mockMcpClient = {
  callTool: async (name, args) => {
    if (name === "get_counters") {
      if (args.hero_id === "layla") {
        return {
          content: [{ text: JSON.stringify([
            { hero: { hero_id: "lancelot", name: "Lancelot" }, reason: "Dive" },
            { hero: { hero_id: "saber", name: "Saber" }, reason: "Lock" }
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
  const suggestions = await suggestCounters(["layla"], [], mockMcpClient);
  if (suggestions.length > 0 && suggestions[0].hero.hero_id === "lancelot") {
    console.log("✅ Passed: Correctly identified counter for Layla.");
  } else {
    console.error("❌ Failed: Counter suggestion logic error.");
  }

  // Test 2: Lane Check
  console.log("Test 2: checkLaneCoverage for [Miya, Atlas]...");
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

runTests().catch(console.error);
