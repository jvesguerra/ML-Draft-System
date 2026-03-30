import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Trophy, Shield, Sword, RefreshCw, X, Ban, User } from 'lucide-react';

const API_BASE = "http://localhost:3001/api/draft";

const ROLES = ["Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"];
const LANES = ["Gold", "EXP", "Mid", "Jungle", "Roam"];

export default function App() {
  const [alliedPicks, setAlliedPicks] = useState([]); // Array of { id, role, lane }
  const [enemyPicks, setEnemyPicks] = useState([]);   // Array of { id }
  const [alliedBans, setAlliedBans] = useState([]);   // Array of strings
  const [enemyBans, setEnemyBans] = useState([]);     // Array of strings

  const [heroList, setHeroList] = useState([]);       // All available heroes
  const [suggestions, setSuggestions] = useState([]);
  const [suggestedBans, setSuggestedBans] = useState([]);
  const [synergySuggestions, setSynergySuggestions] = useState([]);
  const [composition, setComposition] = useState({ total: 0, flags: [] });

  const [inputs, setInputs] = useState({ allied: "", enemy: "", alliedBan: "", enemyBan: "" });
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("BANNING"); // BANNING or PICKING

  // Fetch full hero list on mount
  useEffect(() => {
    const fetchHeroes = async () => {
      try {
        const res = await axios.get(`${API_BASE}/heroes`);
        const sorted = res.data.sort((a, b) => a.name.localeCompare(b.name));
        setHeroList(sorted);
      } catch (e) {
        console.error("Failed to fetch heroes", e);
      }
    };
    fetchHeroes();
  }, []);

  const updateAnalysis = async () => {
    const hasAnyPick = alliedPicks.length > 0 || enemyPicks.length > 0;
    if (!hasAnyPick) {
      setSuggestions([]);
      setSuggestedBans([]);
      setSynergySuggestions([]);
      setComposition({ total: 0, flags: [] });
      return;
    }

    setLoading(true);
    try {
      const aIds = alliedPicks.map(p => p.id).join(",");
      const eIds = enemyPicks.map(p => p.id).join(",");
      const aBans = alliedBans.join(",");
      const eBans = enemyBans.join(",");
      const assignments = JSON.stringify(alliedPicks.map(p => ({
        hero_id: p.id,
        role: p.role,
        lane: p.lane
      })));

      const [recRes, compRes] = await Promise.all([
        axios.get(`${API_BASE}/recommend?allied=${aIds}&enemy=${eIds}&alliedBans=${aBans}&enemyBans=${eBans}&assignments=${assignments}`),
        axios.get(`${API_BASE}/composition?allied=${aIds}&assignments=${assignments}`)
      ]);

      setSuggestions(recRes.data.suggestions || []);
      setSuggestedBans(recRes.data.suggestedBans || []);
      setSynergySuggestions(recRes.data.synergySuggestions || []);
      setComposition(compRes.data);
    } catch (e) {
      console.error("Analysis update error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(updateAnalysis, 200);
    return () => clearTimeout(timer);
  }, [alliedPicks, enemyPicks, alliedBans, enemyBans]);

  const validateAndAdd = (heroName, type) => {
    console.log(`Validating ${heroName} for ${type}`);
    const hero = heroList.find(h => h.name.toLowerCase() === heroName.toLowerCase() || h.hero_id === heroName.toLowerCase());

    if (!hero) {
      console.warn(`Hero not found: ${heroName}`);
      return false;
    }

    const id = hero.hero_id;
    const allTaken = [...alliedPicks.map(p => p.id), ...enemyPicks.map(p => p.id), ...alliedBans, ...enemyBans];

    if (allTaken.includes(id)) {
      console.warn(`Hero already taken: ${id}`);
      return false;
    }

    if (type === 'allied' && alliedPicks.length < 5) {
      const defaultLane = hero.lane && hero.lane.length > 0 ? hero.lane[0] : "";
      const defaultRole = hero.role && hero.role.length > 0 ? hero.role[0] : "";
      setAlliedPicks([...alliedPicks, { id: id, name: hero.name, role: defaultRole, lane: defaultLane }]);
    } else if (type === 'enemy' && enemyPicks.length < 5) {
      setEnemyPicks([...enemyPicks, { id: id, name: hero.name, role: "", lane: "" }]);
    } else if (type === 'alliedBan' && alliedBans.length < 5) {
      setAlliedBans([...alliedBans, id]);
    } else if (type === 'enemyBan' && enemyBans.length < 5) {
      setEnemyBans([...enemyBans, id]);
    }

    return true;
  };

  useEffect(() => {
    if (alliedBans.length === 5 && enemyBans.length === 5 && phase === "BANNING") {
      setPhase("PICKING");
    }
  }, [alliedBans, enemyBans]);

  const updateAssignment = (id, field, value) => {
    setAlliedPicks(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setEnemyPicks(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePick = (id, type) => {
    if (type === 'allied') setAlliedPicks(alliedPicks.filter(p => p.id !== id));
    else if (type === 'enemy') setEnemyPicks(enemyPicks.filter(p => p.id !== id));
    else if (type === 'alliedBan') setAlliedBans(alliedBans.filter(p => p !== id));
    else if (type === 'enemyBan') setEnemyBans(enemyBans.filter(p => p !== id));
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="gold-gradient" style={{ fontSize: '3.5rem', fontWeight: '900', letterSpacing: '-2px' }}>
          MLBB DRAFT v3.0.0
        </h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {alliedBans?.map(b => (
              <BanSlot key={b} id={b} heroList={heroList} onRemove={() => removePick(b, 'alliedBan')} />
            ))}
            {Array(Math.max(0, 5 - alliedBans.length)).fill(0).map((_, i) => <div key={i} className="hero-card empty" style={{ minWidth: '40px', height: '40px' }} />)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.2)' }}>
            <Ban size={24} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {enemyBans?.map(b => (
              <BanSlot key={b} id={b} heroList={heroList} onRemove={() => removePick(b, 'enemyBan')} />
            ))}
            {Array(Math.max(0, 5 - enemyBans.length)).fill(0).map((_, i) => <div key={i} className="hero-card empty" style={{ minWidth: '40px', height: '40px' }} />)}
          </div>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '32px' }}>

        {/* Left: Allied Team */}
        <section className="draft-panel">
          <h2 style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Shield /> ALLIED
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {alliedPicks?.map(p => (
              <HeroCard
                key={p.id}
                hero={p}
                heroList={heroList}
                type="allied"
                onRemove={() => removePick(p.id, 'allied')}
                onUpdate={(f, v) => updateAssignment(p.id, f, v)}
              />
            ))}
            {alliedPicks.length < 5 && phase === "PICKING" && (
              <div className="glass" style={{ padding: '16px', borderRadius: '16px' }}>
                <HeroSearch
                  heroList={heroList}
                  placeholder="Enter Allied Hero..."
                  value={inputs.allied}
                  onChange={(v) => setInputs({ ...inputs, allied: v })}
                  onSelect={(v) => {
                    if (validateAndAdd(v, 'allied')) setInputs({ ...inputs, allied: "" });
                  }}
                />
              </div>
            )}
            {phase === "BANNING" && alliedBans.length < 5 && (
              <div className="glass" style={{ padding: '12px', borderRadius: '12px' }}>
                <HeroSearch
                  heroList={heroList}
                  placeholder="Enter Allied Ban..."
                  value={inputs.alliedBan}
                  onChange={(v) => setInputs({ ...inputs, alliedBan: v })}
                  onSelect={(v) => {
                    if (validateAndAdd(v, 'alliedBan')) setInputs({ ...inputs, alliedBan: "" });
                  }}
                />
              </div>
            )}
          </div>
        </section>

        {/* Center: Analysis & Recs */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass draft-panel" style={{ flex: 1 }}>
            <h3 className="gold-gradient" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy /> STRATEGIC ANALYSIS
            </h3>

            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Team Comp Balance</span>
                <span style={{ fontWeight: 'bold' }}>{composition?.total || 0}/100</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${composition?.total || 0}%`, background: 'var(--accent-gold)',
                  transition: 'width 0.5s ease'
                }} />
              </div>
              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {['P1', 'P2', 'P3', 'P4', 'P5'].map(p => (
                  <div key={p} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>{p}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{Math.round(composition?.pillars?.[p] || 0)}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {composition?.flags?.map((f, i) => <div key={i} style={{ fontSize: '0.8rem', color: '#ff4d4d' }}>• {f}</div>)}
              </div>
            </div>

            <div style={{ marginTop: '32px' }}>
              <h4>Counter Suggestions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {suggestions?.map((s, i) => (
                  <div key={i} className="glass animate-in" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{s?.hero?.name || "Unknown"}</strong>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{s?.reason?.split(':')[0]}</div>
                    </div>
                    <button className="glass" style={{ color: 'var(--accent-gold)', padding: '4px 8px' }} onClick={() => validateAndAdd(s?.hero?.hero_id || "", 'allied')}>Pick</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '32px' }}>
              <h4>Synergy Suggestions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {synergySuggestions?.map((s, i) => (
                  <div key={i} className="glass animate-in" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{s?.name || s?.hero_id}</strong>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{s?.reason}</div>
                    </div>
                    <button className="glass" style={{ color: 'var(--accent-gold)', padding: '4px 8px' }} onClick={() => validateAndAdd(s?.hero_id, 'allied')}>Pick</button>
                  </div>
                ))}
                {synergySuggestions?.length === 0 && <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>No immediate synergies detected.</div>}
              </div>
            </div>
          </div>
        </section>

        {/* Right: Enemy Team */}
        <section className="draft-panel">
          <h2 style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end', marginBottom: '20px' }}>
            ENEMY <Sword />
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {enemyPicks?.map(p => (
              <HeroCard key={p.id} hero={p} heroList={heroList} type="enemy" onRemove={() => removePick(p.id, 'enemy')} />
            ))}
            {enemyPicks.length < 5 && phase === "PICKING" && (
              <div className="glass" style={{ padding: '16px', borderRadius: '16px' }}>
                <HeroSearch
                  heroList={heroList}
                  placeholder="Enter Enemy Hero..."
                  value={inputs.enemy}
                  onChange={(v) => setInputs({ ...inputs, enemy: v })}
                  onSelect={(v) => {
                    if (validateAndAdd(v, 'enemy')) setInputs({ ...inputs, enemy: "" });
                  }}
                />
              </div>
            )}

            {phase === "BANNING" && enemyBans.length < 5 && (
              <div style={{ marginTop: '20px' }}>
                <HeroSearch
                  heroList={heroList}
                  placeholder="Add Enemy Ban..."
                  value={inputs.enemyBan}
                  onChange={(v) => setInputs({ ...inputs, enemyBan: v })}
                  onSelect={(v) => {
                    if (validateAndAdd(v, 'enemyBan')) setInputs({ ...inputs, enemyBan: "" });
                  }}
                />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// Helper Components moved outside to maintain focus/identity
const HeroCard = ({ hero, type, onRemove, onUpdate, heroList }) => {
  const isAllied = type === 'allied';
  const baseHero = heroList?.find(h => h.hero_id === (typeof hero === 'string' ? hero : hero.id));
  const name = baseHero ? baseHero.name : (typeof hero === 'string' ? hero : hero.name);

  const onLaneChange = (lane) => {
    onUpdate('lane', lane);
  };

  return (
    <div className="glass animate-in" style={{
      padding: '12px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
      border: `1px solid ${isAllied ? 'rgba(0,122,255,0.3)' : 'rgba(255,59,48,0.3)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{name}</div>
        <X size={16} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={onRemove} />
      </div>

      {isAllied && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            className="glass"
            style={{ padding: '6px', fontSize: '0.8rem', borderRadius: '6px', color: 'white', flex: 1, border: '1px solid rgba(255,255,255,0.1)' }}
            value={hero.lane || ""}
            onChange={(e) => onLaneChange(e.target.value)}
          >
            <option value="" disabled>Select Lane...</option>
            {LANES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      )}

      {hero.role && <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{hero.role}</div>}
    </div>
  );
};

const BanSlot = ({ id, onRemove, heroList }) => {
  const hero = heroList.find(h => h.hero_id === id);
  return (
    <div className="glass" style={{
      padding: '0 12px', height: '40px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.8rem', border: '1px solid rgba(255,59,48,0.3)', position: 'relative', minWidth: '60px'
    }}>
      {hero ? hero.name : id}
      <X size={10} style={{ position: 'absolute', top: -4, right: 2, cursor: 'pointer', background: 'red', borderRadius: '50%' }} onClick={onRemove} />
    </div>
  );
};

const HeroSearch = ({ value, onChange, onSelect, placeholder, heroList }) => {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    if (!value) return [];
    return heroList.filter(h =>
      h.name.toLowerCase().includes(value.toLowerCase()) ||
      h.hero_id.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 8);
  }, [value, heroList]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        className="glass"
        style={{ width: '100%', padding: '10px', borderRadius: '8px', color: 'white' }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (filtered.length > 0) {
              onSelect(filtered[0].name);
            } else {
              onSelect(value);
            }
          }
        }}
      />
      {open && filtered.length > 0 && (
        <div className="glass" style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          marginTop: '4px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {filtered.map(h => (
            <div
              key={h.hero_id}
              className="search-item"
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              onClick={() => onSelect(h.name)}
            >
              {h.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
