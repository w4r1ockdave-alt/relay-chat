import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Card, Btn, Badge, Skeleton } from '../components/ui.jsx';

export default function Plugins() {
  const [plugins, setPlugins] = useState(null);
  const [err, setErr] = useState('');
  const [cat, setCat] = useState('All');
  const [tuning, setTuning] = useState(null);
  const [tuneParams, setTuneParams] = useState({});

  async function load() {
    try { const d = await api('/api/plugins'); setPlugins(d.plugins); }
    catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function install(p) {
    const prev = plugins;
    setPlugins(plugins.map(x => x.id === p.id ? { ...x, installed: true, downloads: x.downloads + 1 } : x));
    try { await api(`/api/plugins/${p.id}/install`, { method: 'POST' }); }
    catch { setPlugins(prev); }
  }
  async function uninstall(p) {
    const prev = plugins;
    setPlugins(plugins.map(x => x.id === p.id ? { ...x, installed: false } : x));
    try { await api(`/api/plugins/${p.id}/uninstall`, { method: 'POST' }); }
    catch { setPlugins(prev); }
  }
  function openTune(p) { setTuning(p); setTuneParams({ ...p.params }); }
  async function saveTune() {
    const prev = plugins;
    setPlugins(plugins.map(x => x.id === tuning.id ? { ...x, params: tuneParams } : x));
    setTuning(null);
    try { await api(`/api/plugins/${tuning.id}/params`, { method: 'PUT', body: { params: tuneParams } }); }
    catch { setPlugins(prev); }
  }

  if (err) return <div style={{ color: '#fca5a5' }}>{err}</div>;
  if (!plugins) return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><Skeleton h={44} /><Skeleton h={200} /></div>;

  const cats = ['All', ...new Set(plugins.map(p => p.category))];
  const shown = plugins.filter(p => cat === 'All' || p.category === cat);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>VST Plugins</h1>
          <p style={{ color: '#71717a', margin: '4px 0 0', fontSize: 14 }}>{plugins.filter(p => p.installed).length} of {plugins.length} installed · VST3 / AU</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{ padding: '7px 14px', borderRadius: 99, border: '1px solid #27272a', background: cat === c ? '#a3e635' : '#131316', color: cat === c ? '#0a0a0f' : '#d4d4d8', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 14 }}>
        {shown.map(p => (
          <Card key={p.id} style={{ padding: 18, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#71717a' }}>{p.vendor} · v{p.version} · ★ {p.rating} · {(p.downloads || 0).toLocaleString()} downloads</div>
              </div>
              <Badge color={p.installed ? '#14532d' : '#27272a'} text={p.installed ? '#86efac' : '#d4d4d8'}>{p.installed ? 'Installed' : p.price}</Badge>
            </div>
            <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.55, flex: 1, marginBottom: 12 }}>{p.description}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              <Badge>{p.category}</Badge>
              {(p.formats || []).map(f => <Badge key={f} color="#1a2e05" text="#a3e635">{f}</Badge>)}
              <Badge>{p.params?.scale}</Badge>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {p.installed ? (
                <>
                  <Btn primary onClick={() => openTune(p)} style={{ flex: 1 }}>Tune params</Btn>
                  <Btn ghost onClick={() => uninstall(p)}>Uninstall</Btn>
                </>
              ) : (
                <Btn primary onClick={() => install(p)} style={{ flex: 1 }}>Install VST3</Btn>
              )}
            </div>
          </Card>
        ))}
      </div>

      {tuning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 16 }} onClick={() => setTuning(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#131316', border: '1px solid #27272a', borderRadius: 18, padding: 24, width: '100%', maxWidth: 440 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800 }}>{tuning.name}</h3>
            <p style={{ color: '#71717a', fontSize: 12, margin: '0 0 16px' }}>Live-tune this plugin's engine parameters.</p>
            <label style={{ display: 'block', fontSize: 12, color: '#71717a', marginBottom: 12 }}>Scale
              <input value={tuneParams.scale || ''} onChange={e => setTuneParams({ ...tuneParams, scale: e.target.value })} style={inp} />
            </label>
            <label style={{ display: 'block', fontSize: 12, color: '#71717a', marginBottom: 12 }}>Quantize — {tuneParams.quantize}%
              <input type="range" min="0" max="100" value={tuneParams.quantize || 0} onChange={e => setTuneParams({ ...tuneParams, quantize: +e.target.value })} style={{ width: '100%' }} />
            </label>
            <label style={{ display: 'block', fontSize: 12, color: '#71717a', marginBottom: 12 }}>Humanize — {tuneParams.humanize}%
              <input type="range" min="0" max="100" value={tuneParams.humanize || 0} onChange={e => setTuneParams({ ...tuneParams, humanize: +e.target.value })} style={{ width: '100%' }} />
            </label>
            <label style={{ display: 'block', fontSize: 12, color: '#71717a', marginBottom: 16 }}>Harmony
              <select value={tuneParams.harmony || 'off'} onChange={e => setTuneParams({ ...tuneParams, harmony: e.target.value })} style={inp}>
                <option value="off">Off</option><option value="thirds">Thirds</option><option value="arpeggio">Arpeggio</option><option value="roots">Roots</option>
              </select>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn primary onClick={saveTune} style={{ flex: 1 }}>Save params</Btn>
              <Btn ghost onClick={() => setTuning(null)} style={{ flex: 1 }}>Close</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = { width: '100%', marginTop: 6, padding: '9px 10px', borderRadius: 10, border: '1px solid #27272a', background: '#0a0a0f', color: '#fff', fontSize: 13, outline: 'none' };
