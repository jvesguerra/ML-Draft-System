import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const API_PRIMARY = "https://mlbb.rone.dev/api";
const API_BACKUP = "https://openmlbb.fastapicloud.dev/api";

class HeroStore {
  constructor() {
    this.heroMap = new Map();
    this.numericToId = new Map();
    this.initialized = false;
    this.activeBase = API_PRIMARY;
    this.useApiFirst = process.env.USE_API_DATA === 'true';
    this.pool = process.env.SUPABASE_DB_URL ? new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false }
    }) : null;
  }

  async fetchWithFallback(endpoint) {
    // Try Primary
    try {
      const res = await fetch(`${API_PRIMARY}${endpoint}`);
      if (res.ok) {
        this.activeBase = API_PRIMARY;
        return res;
      }
      console.error(`Primary API returned status ${res.status} for ${endpoint}`);
    } catch (e) {
      console.error(`Primary API fetch failed for ${endpoint}:`, e.message);
    }

    // Try Backup
    try {
      console.error(`Attempting backup API for ${endpoint}...`);
      const res = await fetch(`${API_BACKUP}${endpoint}`);
      if (res.ok) {
        this.activeBase = API_BACKUP;
        return res;
      }
      console.error(`Backup API returned status ${res.status} for ${endpoint}`);
    } catch (e) {
      console.error(`Backup API fetch failed for ${endpoint}:`, e.message);
    }

    throw new Error(`All API endpoints failed for ${endpoint}`);
  }

  async fetchFromDB() {
    if (!this.pool) throw new Error("Database connection not configured (SUPABASE_DB_URL missing)");
    
    console.error("🌐 Fetching hero data from Supabase DB...");
    const client = await this.pool.connect();
    try {
      const heroRes = await client.query('SELECT * FROM heroes');
      const relRes = await client.query('SELECT * FROM hero_relations');
      
      const heroes = heroRes.rows;
      const relations = relRes.rows;

      if (heroes.length === 0) throw new Error("Database is empty");

      // Reset maps
      this.heroMap.clear();
      this.numericToId.clear();

      // Index and map hero data
      heroes.forEach(h => {
        this.numericToId.set(h.numeric_id, h.hero_id);
        this.heroMap.set(h.hero_id, {
          hero_id: h.hero_id,
          numeric_id: h.numeric_id,
          name: h.name,
          role: h.role || [],
          lane: h.lane || [],
          damage_type: h.damage_type || "Physical",
          win_rate: parseFloat(h.win_rate) || 0.5,
          ban_rate: parseFloat(h.ban_rate) || 0.01,
          relation: { weak: { target_hero_id: [] }, assist: { target_hero_id: [] } },
          cc_type: [],
          power_stage: "All"
        });
      });

      // Map relations
      relations.forEach(rel => {
        const hero = this.heroMap.get(rel.hero_id);
        if (hero) {
          if (rel.relation_type === 'countered_by' || rel.relation_type === 'counter') {
            const target = heroes.find(h => h.hero_id === rel.related_hero_id);
            if (target) hero.relation.weak.target_hero_id.push(target.numeric_id);
          } else if (rel.relation_type === 'synergy') {
            const target = heroes.find(h => h.hero_id === rel.related_hero_id);
            if (target) hero.relation.assist.target_hero_id.push(target.numeric_id);
          }
        }
      });

      this.initialized = true;
      console.error(`✅ Initialized ${this.heroMap.size} heroes from Supabase DB.`);
      return true;
    } finally {
      client.release();
    }
  }

  async init() {
    // Mode Selection: API First vs DB First
    if (this.useApiFirst) {
      console.error("🚀 Mode: API-First (fetching from remote endpoints...)");
      try {
        await this.initFromAPI();
        return true;
      } catch (e) {
        console.error("⚠️ API initialization failed, falling back to DB:", e.message);
        try {
          await this.fetchFromDB();
          return true;
        } catch (dbE) {
          console.error("❌ DB fallback failed, using hardcoded mocks:", dbE.message);
          return this.initFromMock();
        }
      }
    } else {
      console.error("🏠 Mode: DB-First (fetching from Supabase...)");
      try {
        await this.fetchFromDB();
        return true;
      } catch (e) {
        console.error("⚠️ DB initialization failed, falling back to API:", e.message);
        try {
          await this.initFromAPI();
          return true;
        } catch (apiE) {
          console.error("❌ API fallback failed, using hardcoded mocks:", apiE.message);
          return this.initFromMock();
        }
      }
    }
  }

  async initFromAPI() {
    try {
      console.error("Fetching hero list and rankings from MLBB API...");
      
      const posRes = await this.fetchWithFallback("/heroes/positions?size=200&lang=en");
      const rankRes = await this.fetchWithFallback("/heroes/rank?size=200&lang=en");

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
      console.error(`Initialized ${this.heroMap.size} heroes from MLBB API.`);
      return true;
    } catch (error) {
      throw error;
    }
  }

  initFromMock() {
    console.error("⚠️ Using hardcoded mock fallback data.");
    
    // Fallback mock data with a comprehensive list of heroes
      const mockHeroes = [
        // Fighters
        { hero_id: "73", name: "Chou", role: ["Fighter"], lane: ["EXP", "Roam"] },
        { hero_id: "103", name: "Paquito", role: ["Fighter"], lane: ["EXP", "Jungle"] },
        { hero_id: "123", name: "Arlott", role: ["Fighter", "Assassin"], lane: ["EXP", "Roam"] },
        { hero_id: "119", name: "Fredrinn", role: ["Tank", "Fighter"], lane: ["Jungle", "EXP"] },
        { hero_id: "53", name: "Martis", role: ["Fighter"], lane: ["Jungle", "EXP"] },
        { hero_id: "107", name: "Yu Zhong", role: ["Fighter"], lane: ["EXP"] },
        { hero_id: "99", name: "Terizla", role: ["Fighter"], lane: ["EXP"] },
        { hero_id: "44", name: "Lapu-Lapu", role: ["Fighter"], lane: ["EXP"] },
        { hero_id: "18", name: "Alpha", role: ["Fighter"], lane: ["Jungle", "EXP"] },
        { hero_id: "54", name: "Jawhead", role: ["Fighter"], lane: ["Jungle", "EXP"] },
        { hero_id: "121", name: "Julian", role: ["Fighter", "Mage", "Assassin"], lane: ["Jungle", "EXP", "Mid"] },
        { hero_id: "116", name: "Xavier", role: ["Mage"], lane: ["Mid"] },

        // Assassins
        { hero_id: "84", name: "Lancelot", role: ["Assassin"], lane: ["Jungle"] },
        { hero_id: "58", name: "Gusion", role: ["Assassin", "Mage"], lane: ["Jungle", "Mid"] },
        { hero_id: "101", name: "Benedetta", role: ["Assassin"], lane: ["EXP", "Jungle"] },
        { hero_id: "111", name: "Ling", role: ["Assassin"], lane: ["Jungle"] },
        { hero_id: "39", name: "Fanny", role: ["Assassin"], lane: ["Jungle"] },
        { hero_id: "43", name: "Hayabusa", role: ["Assassin"], lane: ["Jungle"] },
        { hero_id: "105", name: "Aamon", role: ["Assassin"], lane: ["Jungle"] },
        { hero_id: "125", name: "Joy", role: ["Assassin"], lane: ["EXP", "Jungle"] },
        { hero_id: "120", name: "Nolan", role: ["Assassin"], lane: ["Jungle"] },
        { hero_id: "31", name: "Saber", role: ["Assassin"], lane: ["Jungle", "Roam"] },
        { hero_id: "32", name: "Helcurt", role: ["Assassin"], lane: ["Jungle", "Roam"] },

        // Mages
        { hero_id: "64", name: "Lunox", role: ["Mage"], lane: ["Mid", "Jungle"] },
        { hero_id: "15", name: "Eudora", role: ["Mage"], lane: ["Mid"] },
        { hero_id: "87", name: "Harith", role: ["Mage"], lane: ["Gold", "Mid", "Jungle"] },
        { hero_id: "92", name: "Esmeralda", role: ["Mage", "Tank"], lane: ["EXP", "Mid"] },
        { hero_id: "113", name: "Valentina", role: ["Mage"], lane: ["Mid", "EXP"] },
        { hero_id: "106", name: "Yve", role: ["Mage"], lane: ["Mid"] },
        { hero_id: "112", name: "Lylia", role: ["Mage"], lane: ["Mid"] },
        { hero_id: "49", name: "Odette", role: ["Mage"], lane: ["Mid"] },
        { hero_id: "50", name: "Kagura", role: ["Mage"], lane: ["Mid"] },
        { hero_id: "89", name: "Valir", role: ["Mage"], lane: ["Mid", "Roam"] },
        { hero_id: "114", name: "Pharsa", role: ["Mage"], lane: ["Mid"] },
        { hero_id: "117", name: "Vexana", role: ["Mage"], lane: ["Mid"] },

        // Marksmen
        { hero_id: "1", name: "Layla", role: ["Marksman"], lane: ["Gold"] },
        { hero_id: "115", name: "Melissa", role: ["Marksman"], lane: ["Gold"] },
        { hero_id: "108", name: "Beatrix", role: ["Marksman"], lane: ["Gold"] },
        { hero_id: "109", name: "Brody", role: ["Marksman"], lane: ["Gold"] },
        { hero_id: "102", name: "Claude", role: ["Marksman"], lane: ["Gold"] },
        { hero_id: "104", name: "Wanwan", role: ["Marksman"], lane: ["Gold"] },
        { hero_id: "110", name: "Natan", role: ["Marksman"], lane: ["Gold"] },
        { hero_id: "83", name: "Karrie", role: ["Marksman"], lane: ["Gold"] },
        { hero_id: "75", name: "Hanabi", role: ["Marksman"], lane: ["Gold"] },
        { hero_id: "7", name: "Bruno", role: ["Marksman"], lane: ["Gold"] },
        { hero_id: "8", name: "Moskov", role: ["Marksman"], lane: ["Gold"] },
        { hero_id: "82", name: "Irithel", role: ["Marksman"], lane: ["Gold"] },

        // Tanks
        { hero_id: "95", name: "Khufra", role: ["Tank"], lane: ["Roam"] },
        { hero_id: "45", name: "Gloo", role: ["Tank"], lane: ["EXP", "Roam"] },
        { hero_id: "10", name: "Tigreal", role: ["Tank"], lane: ["Roam"] },
        { hero_id: "11", name: "Akai", role: ["Tank"], lane: ["Jungle", "Roam"] },
        { hero_id: "12", name: "Franco", role: ["Tank"], lane: ["Roam"] },
        { hero_id: "27", name: "Gusion", role: ["Assassin", "Mage"], lane: ["Jungle", "Mid"] },
        { hero_id: "88", name: "Belerick", role: ["Tank"], lane: ["Roam", "EXP"] },
        { hero_id: "91", name: "Atlas", role: ["Tank"], lane: ["Roam"] },
        { hero_id: "126", name: "Edith", role: ["Tank", "Marksman"], lane: ["EXP", "Roam", "Gold"] },
        { hero_id: "13", name: "Minotaur", role: ["Tank", "Support"], lane: ["Roam"] },

        // Supports
        { hero_id: "33", name: "Estes", role: ["Support"], lane: ["Roam"] },
        { hero_id: "55", name: "Angela", role: ["Support"], lane: ["Roam", "Mid"] },
        { hero_id: "41", name: "Diggie", role: ["Support"], lane: ["Roam"] },
        { hero_id: "42", name: "Floryn", role: ["Support"], lane: ["Roam"] },
        { hero_id: "61", name: "Rafaela", role: ["Support"], lane: ["Roam"] },
        { hero_id: "62", name: "Nana", role: ["Mage", "Support"], lane: ["Mid"] },
        { hero_id: "96", name: "Mathilda", role: ["Support", "Assassin"], lane: ["Roam", "Mid"] },
        { hero_id: "118", name: "Faramis", role: ["Support", "Mage"], lane: ["Mid", "Roam"] }
      ];

      mockHeroes.forEach(hero => {
        const slug = hero.name.toLowerCase().replace(/ /g, '_');
        this.numericToId.set(hero.hero_id, slug);
        this.heroMap.set(slug, {
          hero_id: slug,
          numeric_id: hero.hero_id,
          name: hero.name,
          role: hero.role,
          lane: hero.lane,
          damage_type: hero.role.includes("Mage") ? "Magic" : "Physical",
          relation: { weak: { target_hero_id: [] }, assist: { target_hero_id: [] } },
          win_rate: 0.5,
          ban_rate: 0.05
        });
      });

      this.initialized = true;
      return true;
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

    const baselineIds = this.mapRelations(hero.relation?.weak);
    const counterSet = new Set();
    const finalCounters = [];

    // Fetch detailed stats from remote API (only if initialized from API)
    if (!this.pool || this.useApiFirst) {
      try {
        const response = await this.fetchWithFallback(`/heroes/${hero.numeric_id}/counters`);
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
        console.error(`Failed to fetch detailed counters for ${heroId}, using baseline`, e.message);
      }
    }

    // Add baseline counters
    baselineIds.forEach(bId => {
      if (!counterSet.has(bId)) {
        const bHero = this.getById(bId);
        if (bHero) {
          finalCounters.push({
            hero: bHero,
            increase_win_rate: 0.02,
            reason: `${bHero.name} is a known hard-counter.`
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
