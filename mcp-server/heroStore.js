const API_BASE = "https://mlbb-stats.rone.dev/api";

class HeroStore {
  constructor() {
    this.heroMap = new Map();
    this.numericToId = new Map();
    this.initialized = false;
  }

  async init() {
    try {
      console.error("Fetching hero list from remote API...");
      const response = await fetch(`${API_BASE}/heroes/positions?size=200&lang=en`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const json = await response.json();
      const records = json.data?.records || [];

      records.forEach(rec => {
        const h = rec.data;
        const name = h.hero?.data?.name || "Unknown";
        const strId = name.toLowerCase()
          .replace(/ /g, '_')
          .replace(/-/g, '_')
          .replace(/'/g, '')
          .replace(/\./g, '');
        
        // Map numeric ID to string ID
        this.numericToId.set(h.hero_id, strId);

        // Basic formatting
        this.heroMap.set(strId, {
          hero_id: strId,
          numeric_id: h.hero_id,
          name: name,
          role: (h.hero?.data?.sortid || []).map(s => s.data?.sort_title).filter(Boolean),
          lane: (h.hero?.data?.roadsort || []).map(r => r.data?.road_sort_title?.replace(' Lane', '')).filter(Boolean),
          damage_type: h.hero?.data?.sortid?.[0]?.data?.sort_title?.toLowerCase().includes("mage") || 
                       h.hero?.data?.sortid?.[0]?.data?.sort_title?.toLowerCase().includes("support") ? "Magic" : "Physical",
          relation: h.relation || {},
          cc_type: [], // The API doesn't provide this clearly in the list, would need detail calls
          power_stage: "All"
        });
      });

      this.initialized = true;
      console.error(`Initialized ${this.heroMap.size} heroes from API.`);
      return true;
    } catch (error) {
      console.error("Failed to initialize HeroStore from API:", error);
      return false;
    }
  }

  getById(id) {
    return this.heroMap.get(id);
  }

  mapRelations(relList) {
    if (!relList) return [];
    return relList.map(nId => this.numericToId.get(nId)).filter(Boolean);
  }

  getCounterReason(sourceId, targetId) {
    return `${targetId} is statistically effective against ${sourceId} according to MLBB global data.`;
  }

  evaluateSynergy(heroIds) {
    let score = 0;
    let combos = [];
    heroIds.forEach(id => {
      const hero = this.getById(id);
      if (hero && hero.relation?.assist?.target_hero_id) {
        const synergists = this.mapRelations(hero.relation.assist.target_hero_id);
        const activeSynergies = synergists.filter(sId => heroIds.includes(sId));
        if (activeSynergies.length > 0) {
          score += activeSynergies.length * 10;
          activeSynergies.forEach(sId => {
            const partner = this.getById(sId);
            if (partner) combos.push(`${hero.name} + ${partner.name}`);
          });
        }
      }
    });
    return { score, combos: [...new Set(combos)] };
  }
}

export const heroStore = new HeroStore();
