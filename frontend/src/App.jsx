import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Trophy, Shield, Sword, X, Ban, Users, Info } from 'lucide-react';
import './App.css';

const API_BASE = "http://localhost:3001/api/draft";

const ROLES = ["All", "tank", "fighter", "assassin", "mage", "Marksman", "support"];
const LANES = ["Gold", "Exp", "Mid", "Jungle", "Roam"];

const DRAFT_ORDER = [
  // Bans 1 (3 Allied, then 3 Enemy)
  { type: 'alliedBan', label: 'Allied Ban 1' },
  { type: 'alliedBan', label: 'Allied Ban 2' },
  { type: 'alliedBan', label: 'Allied Ban 3' },
  { type: 'enemyBan', label: 'Enemy Ban 1' },
  { type: 'enemyBan', label: 'Enemy Ban 2' },
  { type: 'enemyBan', label: 'Enemy Ban 3' },
  // Bans 2 (2 Allied, then 2 Enemy)
  { type: 'alliedBan', label: 'Allied Ban 4' },
  { type: 'alliedBan', label: 'Allied Ban 5' },
  { type: 'enemyBan', label: 'Enemy Ban 4' },
  { type: 'enemyBan', label: 'Enemy Ban 5' },
  // Picks (B1, R1-2, B2-3, R3-4, B4-5, R5)
  { type: 'allied', label: 'Allied Pick 1' },
  { type: 'enemy', label: 'Enemy Pick 1' },
  { type: 'enemy', label: 'Enemy Pick 2' },
  { type: 'allied', label: 'Allied Pick 2' },
  { type: 'allied', label: 'Allied Pick 3' },
  { type: 'enemy', label: 'Enemy Pick 3' },
  { type: 'enemy', label: 'Enemy Pick 4' },
  { type: 'allied', label: 'Allied Pick 4' },
  { type: 'allied', label: 'Allied Pick 5' },
  { type: 'enemy', label: 'Enemy Pick 5' },
];

export default function App() {
  const [alliedPicks, setAlliedPicks] = useState([]);
  const [enemyPicks, setEnemyPicks] = useState([]);
  const [alliedBans, setAlliedBans] = useState([]);
  const [enemyBans, setEnemyBans] = useState([]);

  const [heroList, setHeroList] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [synergySuggestions, setSynergySuggestions] = useState([]);
  const [composition, setComposition] = useState({ total: 0, flags: [] });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeRole, setActiveRole] = useState("All");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectionMode, setSelectionMode] = useState(DRAFT_ORDER[0].type); 

  // Fetch heroes
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
      setSynergySuggestions(recRes.data.synergySuggestions || []);
      setComposition(compRes.data);
    } catch (e) {
      console.error("Analysis update error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(updateAnalysis, 300);
    return () => clearTimeout(timer);
  }, [alliedPicks, enemyPicks, alliedBans, enemyBans]);

  const validateAndAdd = (hero) => {
    const id = hero.hero_id;
    const allTaken = [...alliedPicks.map(p => p.id), ...enemyPicks.map(p => p.id), ...alliedBans, ...enemyBans];

    if (allTaken.includes(id)) return;

    if (selectionMode === 'allied' && alliedPicks.length < 5) {
      const defaultLane = hero.lane && hero.lane.length > 0 ? hero.lane[0] : "";
      const defaultRole = hero.role && hero.role.length > 0 ? hero.role[0] : "";
      setAlliedPicks([...alliedPicks, { id: id, name: hero.name, role: defaultRole, lane: defaultLane }]);
    } else if (selectionMode === 'enemy' && enemyPicks.length < 5) {
      setEnemyPicks([...enemyPicks, { id: id, name: hero.name }]);
    } else if (selectionMode === 'alliedBan' && alliedBans.length < 5) {
      setAlliedBans([...alliedBans, id]);
    } else if (selectionMode === 'enemyBan' && enemyBans.length < 5) {
      setEnemyBans([...enemyBans, id]);
    }

    // Auto-advance draft step
    if (currentStep < DRAFT_ORDER.length - 1) {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      setSelectionMode(DRAFT_ORDER[nextIdx].type);
    }
  };

  const resetDraft = () => {
    setAlliedPicks([]);
    setEnemyPicks([]);
    setAlliedBans([]);
    setEnemyBans([]);
    setCurrentStep(0);
    setSelectionMode(DRAFT_ORDER[0].type);
  };

  const removePick = (id, type) => {
    if (type === 'allied') setAlliedPicks(alliedPicks.filter(p => p.id !== id));
    else if (type === 'enemy') setEnemyPicks(enemyPicks.filter(p => p.id !== id));
    else if (type === 'alliedBan') setAlliedBans(alliedBans.filter(p => p !== id));
    else if (type === 'enemyBan') setEnemyBans(enemyBans.filter(p => p !== id));
  };

  const filteredHeroes = useMemo(() => {
    return heroList.filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = activeRole === "All" || h.role.some(r => r.toLowerCase().includes(activeRole.toLowerCase()));
      return matchesSearch && matchesRole;
    });
  }, [heroList, searchQuery, activeRole]);
  const isActiveSlot = (type, index) => {
    if (currentStep >= DRAFT_ORDER.length) return false;
    const step = DRAFT_ORDER[currentStep];
    
    if (step.type !== type) return false;
    
    // Find absolute index of current type in DRAFT_ORDER
    let typeIndex = -1;
    let count = 0;
    for (let i = 0; i <= currentStep; i++) {
        if (DRAFT_ORDER[i].type === type) {
            count++;
        }
    }
    typeIndex = count - 1;
    
    return typeIndex === index;
  };

  return (
    <div className="draft-container">
      {/* Header with Bans */}
      <header className="draft-header glass">
        <div className="ban-section">
          {Array(5).fill(0).map((_, i) => (
            <div
              key={`allied-ban-${i}`}
              className={`ban-slot ${alliedBans[i] ? 'occupied' : ''} ${selectionMode === 'alliedBan' && isActiveSlot('alliedBan', i) ? 'active-slot' : ''} ${selectionMode === 'alliedBan' ? 'active-selection' : ''}`}
              onClick={() => setSelectionMode('alliedBan')}
            >
              {alliedBans[i] ? (
                <>
                  <span className="hero-name-mini">{heroList.find(h => h.hero_id === alliedBans[i])?.name || alliedBans[i]}</span>
                  <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removePick(alliedBans[i], 'alliedBan'); }}>×</button>
                </>
              ) : <Ban size={16} opacity={0.3} />}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 className="gold-gradient" style={{ margin: 0, fontSize: '1.5rem' }}>MLBB DRAFT v4.0.0</h1>
          <div style={{ fontSize: '0.7rem', opacity: 0.5, letterSpacing: '2px' }}>PROPER PICKING SYSTEM</div>
          <button className="reset-btn glass" onClick={resetDraft}>RESET DRAFT</button>
        </div>

        <div className="ban-section">
          {Array(5).fill(0).map((_, i) => (
            <div
              key={`enemy-ban-${i}`}
              className={`ban-slot ${enemyBans[i] ? 'occupied' : ''} ${selectionMode === 'enemyBan' && isActiveSlot('enemyBan', i) ? 'active-slot' : ''} ${selectionMode === 'enemyBan' ? 'active-selection' : ''}`}
              onClick={() => setSelectionMode('enemyBan')}
            >
              {enemyBans[i] ? (
                <>
                  <span className="hero-name-mini">{heroList.find(h => h.hero_id === enemyBans[i])?.name || enemyBans[i]}</span>
                  <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removePick(enemyBans[i], 'enemyBan'); }}>×</button>
                </>
              ) : <Ban size={16} opacity={0.3} />}
            </div>
          ))}
        </div>
      </header>

      <main className="draft-main">
        {/* Left Sidebar - Allied Picks */}
        <div className="team-sidebar">
          <div className="sidebar-label" style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} /> ALLIED TEAM
          </div>
          {Array(5).fill(0).map((_, i) => {
            const pick = alliedPicks[i];
            const isTurn = isActiveSlot('allied', i);
            const isActive = selectionMode === 'allied' && (isTurn || (alliedPicks.length === i));
            return (
              <div
                key={`allied-pick-${i}`}
                className={`pick-slot ${isActive ? 'active' : ''} ${isTurn ? 'active-slot' : ''}`}
                onClick={() => setSelectionMode('allied')}
              >
                <div className="pick-circle">
                  {pick ? pick.name : (isActive ? 'PICK' : '')}
                </div>
                <div className="pick-info">
                  {pick ? (
                    <>
                      <div className="pick-name">{pick.name}</div>
                      <div className="pick-meta">{pick.lane || 'Unassigned'}</div>
                      <button className="remove-btn-small" onClick={(e) => { e.stopPropagation(); removePick(pick.id, 'allied'); }}>×</button>
                    </>
                  ) : <div className="pick-empty">...</div>}
                </div>
              </div>
            );
          })}

          <div className="analysis-section glass" style={{ marginTop: 'auto', padding: '15px', borderRadius: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem' }}>Composition Balance</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-gold)' }}>{composition.total}/100</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: `${composition.total}%`, background: 'var(--accent-gold)', transition: 'width 0.5s' }} />
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#ff4d4d' }}>
              {composition.flags?.slice(0, 2).map((f, i) => <div key={i}>• {f}</div>)}
            </div>
          </div>
        </div>

        {/* Center - Hero Selection Area */}
        <div className="selection-area">
          <div className="search-container">
            <Search size={20} opacity={0.5} />
            <input
              placeholder="Search hero name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && <X size={18} style={{ cursor: 'pointer' }} onClick={() => setSearchQuery("")} />}
          </div>

          <div className="role-tabs">
            {ROLES.map(role => (
              <button
                key={role}
                className={`role-tab ${activeRole === role ? 'active' : ''}`}
                onClick={() => setActiveRole(role)}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="hero-grid">
            {filteredHeroes.map(hero => {
              const isTaken = [...alliedPicks, ...enemyPicks].some(p => p.id === hero.hero_id) ||
                [...alliedBans, ...enemyBans].includes(hero.hero_id);
              return (
                <div
                  key={hero.hero_id}
                  className={`hero-item ${isTaken ? 'taken' : ''}`}
                  onClick={() => !isTaken && validateAndAdd(hero)}
                >
                  <div className="hero-item-circle">
                    {hero.name.charAt(0)}
                  </div>
                  <div className="hero-item-name">{hero.name}</div>
                </div>
              );
            })}
          </div>

          <div className="suggestions-bar">
            <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Trophy size={14} /> RECOMMENDED FOR CURRENT TURN
            </div>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
              {suggestions.map((s, i) => (
                <div key={i} className="suggestion-pill glass" onClick={() => validateAndAdd(s.hero)}>
                  {s.hero?.name}
                </div>
              ))}
              {suggestions.length === 0 && <div style={{ fontSize: '0.8rem', opacity: 0.3 }}>No data-driven suggestions yet...</div>}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Enemy Picks */}
        <div className="team-sidebar">
          <div className="sidebar-label" style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
            ENEMY TEAM <Users size={18} />
          </div>
          {Array(5).fill(0).map((_, i) => {
            const pick = enemyPicks[i];
            const isTurn = isActiveSlot('enemy', i);
            const isActive = selectionMode === 'enemy' && (isTurn || (enemyPicks.length === i));
            return (
              <div
                key={`enemy-pick-${i}`}
                className={`pick-slot enemy ${isActive ? 'active' : ''} ${isTurn ? 'active-slot' : ''}`}
                onClick={() => setSelectionMode('enemy')}
              >
                <div className="pick-circle">
                  {pick ? pick.name : (isActive ? 'PICK' : '')}
                </div>
                <div className="pick-info" style={{ textAlign: 'right' }}>
                  {pick ? (
                    <>
                      <div className="pick-name">{pick.name}</div>
                      <div className="pick-meta">Priority Target</div>
                      <button className="remove-btn-small" style={{ left: 10, right: 'auto' }} onClick={(e) => { e.stopPropagation(); removePick(pick.id, 'enemy'); }}>×</button>
                    </>
                  ) : <div className="pick-empty">...</div>}
                </div>
              </div>
            );
          })}

          <div className="synergy-section glass" style={{ marginTop: 'auto', padding: '15px', borderRadius: '15px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '5px' }}>
              SYNERGIES
            </div>
            {synergySuggestions.slice(0, 3).map((s, i) => (
              <div key={i} style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>{s.name}</span>
                <span style={{ color: 'var(--accent-gold)' }}>+SYNERGY</span>
              </div>
            ))}
            {synergySuggestions.length === 0 && <div style={{ fontSize: '0.7rem', opacity: 0.3 }}>No synergy detected</div>}
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        .active-selection { border-color: var(--accent-gold) !important; box-shadow: 0 0 10px rgba(212, 175, 55, 0.3); outline: 2px solid var(--accent-gold); }
        .hero-name-mini { font-size: 0.5rem; text-align: center; }
        .hero-item-circle { width: 40px; height: 40px; border-radius: 50%; background: var(--accent-gold); color: black; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; }
        .hero-item.taken .hero-item-circle { background: #444; color: #888; }
        .suggestion-pill { padding: 6px 15px; border-radius: 20px; font-size: 0.8rem; cursor: pointer; white-space: nowrap; border: 1px solid var(--accent-gold); color: var(--accent-gold); }
        .suggestion-pill:hover { background: var(--accent-gold); color: black; }
        .remove-btn-small { position: absolute; top: 10px; right: 10px; background: rgba(255,59,48,0.2); border: none; color: #ff3b30; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .remove-btn-small:hover { background: #ff3b30; color: white; }
        .sidebar-label { font-weight: 800; font-size: 0.9rem; letter-spacing: 1px; margin-bottom: 5px; }
        .reset-btn { margin-top: 10px; padding: 4px 12px; font-size: 0.6rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; transition: all 0.3s; opacity: 0.6; }
        .reset-btn:hover { opacity: 1; border-color: var(--accent-red); color: var(--accent-red); }
        .active-slot { border: 2px solid var(--accent-gold) !important; box-shadow: 0 0 15px rgba(212, 175, 55, 0.4); }
      `}} />
    </div>
  );
}
