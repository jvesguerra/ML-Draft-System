const API_BASE = "https://mlbb-stats.rone.dev/api";

class HeroStore {
  constructor() {
    this.heroMap = new Map();
    this.numericToId = new Map();
    this.initialized = false;
  }

  async init() {
    try {
      console.error("Fetching hero list and rankings from remote API...");
      const [posRes, rankRes] = await Promise.all([
        fetch(`${API_BASE}/heroes/positions?size=200&lang=en`),
        fetch(`${API_BASE}/heroes/rank?size=200&lang=en`)
      ]);
      
      if (!posRes.ok || !rankRes.ok) throw new Error(`HTTP error! status: ${posRes.status} / ${rankRes.status}`);
      
      const posJson = await posRes.json();
      const rankJson = await rankRes.json();
      
      const records = posJson.data?.records || [];
      const ranks = rankJson.data?.records || [];

      // Create a map for quick rank lookup by name slug
      const rankMap = new Map();
      ranks.forEach(r => {
        const name = r.data?.main_hero?.data?.name;
        if (name) {
          const slug = name.toLowerCase().replace(/ /g, '_').replace(/-/g, '_').replace(/'/g, '').replace(/\./g, '');
          rankMap.set(slug, r.data);
        }
      });

      records.forEach(rec => {
        const h = rec.data;
        const name = h.hero?.data?.name || "Unknown";
        const slug = name.toLowerCase()
          .replace(/ /g, '_')
          .replace(/-/g, '_')
          .replace(/'/g, '')
          .replace(/\./g, '');
        
        this.numericToId.set(h.hero_id, slug);

        const meta = rankMap.get(slug) || {};

        this.heroMap.set(slug, {
          hero_id: slug,
          numeric_id: h.hero_id,
          name: name,
          role: (h.hero?.data?.sortid || []).map(s => s.data?.sort_title).filter(Boolean),
          lane: (h.hero?.data?.roadsort || []).map(r => r.data?.road_sort_title?.replace(' Lane', '')).filter(Boolean),
          damage_type: h.hero?.data?.sortid?.[0]?.data?.sort_title?.toLowerCase().includes("mage") || 
                       h.hero?.data?.sortid?.[0]?.data?.sort_title?.toLowerCase().includes("support") ? "Magic" : "Physical",
          relation: h.relation || {},
          win_rate: meta.hero_win_rate || 0.5,
          ban_rate: meta.hero_ban_rate || 0.01,
          cc_type: [], 
          power_stage: "All"
        });
      });

      this.initialized = true;
      console.error(`Initialized ${this.heroMap.size} heroes with meta rankings (name-matched).`);
      return true;
    } catch (error) {
      console.error("Failed to initialize HeroStore from API:", error);
      return false;
    }
  }

  getById(id) {
    return this.heroMap.get(id);
  }

  mapRelations(relData) {
    if (!relData) return [];
    const list = Array.isArray(relData) ? relData : (relData.target_hero_id || []);
    return list.map(nId => this.numericToId.get(nId)).filter(Boolean);
  }

  getCounterReason(sourceId, targetId) {
    return `${targetId} is statistically effective against ${sourceId} according to MLBB global data.`;
  }

  async getCountersDetailed(heroId) {
    const hero = this.getById(heroId);
    if (!hero) return [];
    
    // 1. Get baseline counters from local relations (curated)
    const baselineIds = this.mapRelations(hero.relation?.weak);
    const counterSet = new Set();
    const finalCounters = [];

    // 2. Fetch detailed stats from remote API
    try {
      const response = await fetch(`${API_BASE}/heroes/${hero.numeric_id}/counters`);
      const json = await response.json();
      const records = json.data?.records || [];
      
      records.forEach(r => {
        const hData = r.data || {};
        const name = hData.main_hero?.data?.name;
        if (!name) return;

        const slug = name.toLowerCase().replace(/ /g, '_').replace(/-/g, '_').replace(/'/g, '').replace(/\./g, '');
        const counterHero = this.getById(slug);
        
        if (counterHero && counterHero.hero_id !== heroId) {
          counterSet.add(counterHero.hero_id);
          finalCounters.push({
            hero: counterHero,
            increase_win_rate: hData.increase_win_rate || 0.01,
            reason: this.getCounterReason(heroId, slug)
          });
        }
      });
    } catch (e) {
      console.error(`Failed to fetch detailed counters for ${heroId}, falling back to local`, e);
    }

    // 3. Add baseline counters if they were missing from the remote API
    baselineIds.forEach(bId => {
      if (!counterSet.has(bId)) {
        const bHero = this.getById(bId);
        if (bHero) {
          finalCounters.push({
            hero: bHero,
            increase_win_rate: 0.02, // Default weight for curated counters
            reason: `${bHero.name} is a known hard-counter (API Baseline).`
          });
          counterSet.add(bId);
        }
      }
    });

    return finalCounters;
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
