import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Card, Btn, Empty, Skeleton, Badge } from '../components/ui.jsx';

const EMPTY_PARAMS = { scale: 'C Major', quantize: 75, humanize: 30, harmony: 'thirds', tempo: 120 };

export default function Presets() {
  const [presets, setPresets] = useState(null);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [params, setParams] = useState(EMPTY_PARAMS);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});

  async function load() {
    try { const d = await api('/api/presets'); setPresets(d.presets); }
    catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!name.trim()) return;
    const prev = presets;
    const optimistic = { id: 'tmp_' + Date.now(), name, params, createdAt: new Date().toISOString() };
    setPresets([optimistic, ...presets]);
    setName(''); setParams(EMPTY_PARAMS);
    try {
      const d = await api('/api/presets', { method: 'POST', body: { name: optimistic.name, params } });
      setPresets(ps => ps.map(p => p.id === optimistic.id ? d.preset : p));
    } catch { setPresets(prev); }
  }

  async function remove(p) {
    if (!confirm(`Delete preset "${p.name}"?`)) return;
    const prev = presets;
    setPresets(presets.filter(x => x.id !== p.id));
    try { await api(`/api/presets/${p.id}`, { method: 'DELETE' }); }
    catch { setPresets(prev); }
  }

  function startEdit(p) { setEditing(p.id); setEditForm({ name: p.name, params: { ...p.params } }); }
  async function saveEdit() {
    const prev = presets;
    setPresets(presets.map(x => x.id === editing ? { ...x, ...editForm } : x));
    setEditing(null);
    try { await api(`/api/presets/${editing}`, { method: 'PUT', body: editForm }); }
    catch { setPresets(prev); }
  }

  if (err) return <div style={{ color: '#fca5a5' }}>{err}</div>;
  if (!presets) return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><Skeleton h={44} /><Skeleton h={160} /></div>;

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Presets</h1>
      <p style={{ color: '#71717a', margin: '0 0 20px', fontSize: 14 }}>Save your favorite engine settings and reuse them across projects.</p>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800 }}>New preset</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 10 }} className="preset-form">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Preset name, e.g. Dark Synthwave" style={inp} />
          <input value={params.scale} onChange={e => setParams({ ...params, scale: e.target.value })} placeholder="Scale" style={inp} />
          <select value={params.harmony} onChange={e => setParams({ ...params, harmony: e.target.value })} style={inp}>
            <option value="off">No harmony</option><option value="thirds">Thirds</option><option value="arpeggio">Arpeggio</option><option value="roots">Roots</option>
          </select>
          <Btn primary onClick={create} disabled={!name.trim()}>+ Create</Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
          <label style={{ fontSize: 12, color: '#71717a' }}>Quantize {params.quantize}%<input type="range" min="0" max="100" value={params.quantize} onChange={e => setParams({ ...params, quantize: +e.target.value })} style={{ width: '100%' }} /></label>
          <label style={{ fontSize: 12, color: '#71717a' }}>Humanize {params.humanize}%<input type="range" min="0" max="100" value={params.humanize} onChange={e => setParams({ ...params, humanize: +e.target.value })} style={{ width: '100%' }} /></label>
          <label style={{ fontSize: 12, color: '#71717a' }}>Tempo {params.tempo}<input type="range" min="60" max="180" value={params.tempo} onChange={e => setParams({ ...params, tempo: +e.target.value })} style={{ width: '100%' }} /></label>
        </div>
      </Card>

      {presets.length === 0 ? (
        <Empty title="No presets yet" desc="Create your first preset above — it takes two seconds and saves your go-to sound." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {presets.map(p => (
            <Card key={p.id} style={{ padding: 16 }}>
              {editing === p.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={inp} />
                  <input value={editForm.params.scale} onChange={e => setEditForm({ ...editForm, params: { ...editForm.params, scale: e.target.value } })} style={inp} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn primary onClick={saveEdit} style={{ flex: 1 }}>Save</Btn>
                    <Btn ghost onClick={() => setEditing(null)} style={{ flex: 1 }}>Cancel</Btn>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{p.name}</div>
                    <Badge>{p.params?.harmony || '—'}</Badge>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    <Badge>{p.params?.scale}</Badge>
                    <Badge>Q {p.params?.quantize}%</Badge>
                    <Badge>H {p.params?.humanize}%</Badge>
                    <Badge>{p.params?.tempo} BPM</Badge>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn ghost onClick={() => startEdit(p)} style={{ flex: 1 }}>Edit</Btn>
                    <Btn danger onClick={() => remove(p)}>Delete</Btn>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
      <style>{`@media (max-width: 800px){ .preset-form{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

const inp = { width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid #27272a', background: '#0a0a0f', color: '#fff', fontSize: 13, outline: 'none' };
