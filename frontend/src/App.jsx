import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Trophy, Shield, Sword, RefreshCw, X } from 'lucide-react';

const API_BASE = "http://localhost:3001/api/draft";

export default function App() {
  const [alliedPicks, setAlliedPicks] = useState([]);
  const [enemyPicks, setEnemyPicks] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [composition, setComposition] = useState({ total: 0, flags: [] });
  const [search, setSearch] = useState("");
  // In a real app we'd fetch the full list, but for now we'll support searching a set
  const [loading, setLoading] = useState(false);

  const updateDraft = async () => {
    if (enemyPicks.length === 0 && alliedPicks.length === 0) {
      setSuggestions([]);
      setComposition({ total: 0, flags: [] });
      return;
    }

    setLoading(true);
    try {
      const [recRes, compRes] = await Promise.all([
        axios.get(`${API_BASE}/recommend?enemy=${enemyPicks.join(",")}&allied=${alliedPicks.join(",")}`),
        axios.get(`${API_BASE}/composition?allied=${alliedPicks.join(",")}`)
      ]);
      setSuggestions(recRes.data.suggestions);
      setComposition(compRes.data);
    } catch (e) {
      console.error("Draft update error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(updateDraft, 500);
    return () => clearTimeout(timer);
  }, [alliedPicks, enemyPicks]);

  const addHero = (id, side) => {
    if (side === 'allied' && alliedPicks.length < 5 && !alliedPicks.includes(id)) {
      setAlliedPicks([...alliedPicks, id]);
    } else if (side === 'enemy' && enemyPicks.length < 5 && !enemyPicks.includes(id)) {
      setEnemyPicks([...enemyPicks, id]);
    }
    setSearch("");
  };

  const removeHero = (id, side) => {
    if (side === 'allied') setAlliedPicks(alliedPicks.filter(p => p !== id));
    else setEnemyPicks(enemyPicks.filter(p => p !== id));
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="gold-gradient" style={{ fontSize: '3rem', fontWeight: '900', letterSpacing: '-1px' }}>
          DRAFT ASSISTANT
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Mobile Legends Tactical Engine v1.0</p>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        
        {/* Left: Draft Board */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section className="glass draft-panel allied-slot">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={20} color="var(--accent-blue)" /> ALLIED TEAM
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[0,1,2,3,4].map(idx => (
                <div key={idx} className={`hero-card ${alliedPicks[idx] ? '' : 'empty'}`} 
                     onClick={() => alliedPicks[idx] && removeHero(alliedPicks[idx], 'allied')}>
                  {alliedPicks[idx] && (
                    <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {alliedPicks[idx].slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                 <input 
                  className="glass"
                  style={{ padding: '8px 12px', borderRadius: '8px', color: 'white', flex: 1 }}
                  placeholder="Add Allied Hero (e.g. kagura)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addHero(e.target.value.toLowerCase(), 'allied')}
                 />
            </div>
          </section>

          <section className="glass draft-panel enemy-slot">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
              ENEMY TEAM <Sword size={20} color="var(--accent-red)" />
            </h3>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {[0,1,2,3,4].map(idx => (
                <div key={idx} className={`hero-card ${enemyPicks[idx] ? '' : 'empty'}`}
                     onClick={() => enemyPicks[idx] && removeHero(enemyPicks[idx], 'enemy')}>
                  {enemyPicks[idx] && (
                    <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {enemyPicks[idx].slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <input 
              className="glass"
              style={{ padding: '8px 12px', borderRadius: '8px', color: 'white' }}
              placeholder="Add Enemy Hero (e.g. layla)"
              onKeyPress={(e) => e.key === 'Enter' && addHero(e.target.value.toLowerCase(), 'enemy')}
            />
          </section>
        </div>

        {/* Right: Analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section className="glass draft-panel" style={{ height: '100%' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)' }}>
              <Trophy size={20} /> ADAPTIVE RECOMMENDATIONS
            </h3>
            
            {loading ? <p><RefreshCw className="animate-spin" /> Analyzing roster...</p> : (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {suggestions.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Enter enemy picks to see counter-pick suggestions.</p>}
                {suggestions.map((entry, idx) => (
                  <div key={idx} className="animate-in" style={{ 
                    padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <strong style={{ display: 'block' }}>{entry.hero.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{entry.reason}</span>
                    </div>
                    <button className="glass" style={{ padding: '6px 12px', color: 'var(--accent-gold)', borderRadius: '8px', cursor: 'pointer' }}
                            onClick={() => addHero(entry.hero.hero_id, 'allied')}>
                      Pick
                    </button>
                  </div>
                ))}
              </div>
            )}

            <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>COMPOSITION SCORE</strong>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: composition.total > 70 ? '#4cd964' : '#ffcc00' }}>
                {composition.total}/100
              </span>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {composition.flags.map((flag, idx) => (
                <div key={idx} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,59,48,0.1)', color: '#ff4d4d', fontSize: '0.9rem' }}>
                  {flag}
                </div>
              ))}
            </div>
          </section>
        </div>

      </main>
    </div>
  );
}
