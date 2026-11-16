import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, midiName } from '../lib/api.js';
import { Card, Stat, Skeleton, Badge, Btn, PianoRoll } from '../components/ui.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/api/dashboard').then(setData).catch(e => setErr(e.message));
  }, []);

  if (err) return <div style={{ color: '#fca5a5' }}>{err}</div>;
  if (!data) return (
    <div>
      <Skeleton h={40} /><div style={{ height: 12 }} /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>
    </div>
  );

  const s = data.stats;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Good to see you 👋</h1>
          <p style={{ color: '#71717a', margin: '6px 0 0', fontSize: 14 }}>Your MIDI-to-melody workspace at a glance.</p>
        </div>
        <Link to="/studio" style={{ textDecoration: 'none' }}><Btn primary>＋ New conversion</Btn></Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <Stat label="Projects" value={s.projects} sub={`${s.published} published`} />
        <Stat label="Melody notes" value={s.totalNotes} sub="generated so far" />
        <Stat label="Favorites" value={s.favorites} sub="starred projects" />
        <Stat label="VST installed" value={s.installedPlugins} sub="of 6 plugins" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }} className="dash-grid">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Recent projects</h3>
            <Link to="/projects" style={{ fontSize: 12, color: '#a3e635', textDecoration: 'none', fontWeight: 700 }}>View all →</Link>
          </div>
          {data.recent.length === 0 ? (
            <div style={{ color: '#71717a', fontSize: 13, textAlign: 'center', padding: 24 }}>No projects yet. <Link to="/studio" style={{ color: '#a3e635' }}>Create your first conversion</Link>.</div>
          ) : data.recent.map(p => (
            <Link key={p.id} to="/projects" style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #1f1f23', textDecoration: 'none', color: '#fff', alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1a2e05', display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }}>♪</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#71717a' }}>{p.key} {p.scale} · {p.tempo} BPM · {(p.melodyNotes?.length || 0)} notes</div>
              </div>
              <Badge color={p.status === 'published' ? '#14532d' : '#27272a'} text={p.status === 'published' ? '#86efac' : '#d4d4d8'}>{p.status}</Badge>
              {p.favorite && <span style={{ color: '#facc15' }}>★</span>}
            </Link>
          ))}
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800 }}>Quick start</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/studio" style={{ textDecoration: 'none' }}><Btn primary style={{ width: '100%' }}>Upload MIDI & generate</Btn></Link>
              <Link to="/plugins" style={{ textDecoration: 'none' }}><Btn ghost style={{ width: '100%' }}>Browse VST catalog</Btn></Link>
              <Link to="/presets" style={{ textDecoration: 'none' }}><Btn ghost style={{ width: '100%' }}>Manage presets</Btn></Link>
            </div>
          </Card>
          <Card>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800 }}>Featured plugins</h3>
            {data.plugins.map(pl => (
              <div key={pl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1f1f23' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{pl.name}</div>
                  <div style={{ fontSize: 11, color: '#71717a' }}>{pl.category} · v{pl.version} · ★ {pl.rating}</div>
                </div>
                <Badge color={pl.installed ? '#14532d' : '#27272a'} text={pl.installed ? '#86efac' : '#d4d4d8'}>{pl.installed ? 'Installed' : pl.price}</Badge>
              </div>
            ))}
          </Card>
        </div>
      </div>
      <style>{`@media (max-width: 900px){ .dash-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
