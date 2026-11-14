import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Card, Btn, Badge, Empty, Skeleton, PianoRoll } from '../components/ui.jsx';
import { playNotes, stopPlayback } from '../lib/audio.js';

export default function Projects() {
  const [projects, setProjects] = useState(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [playing, setPlaying] = useState(null);

  async function load() {
    try { const d = await api('/api/projects'); setProjects(d.projects); }
    catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function toggleFav(p) {
    const next = projects.map(x => x.id === p.id ? { ...x, favorite: !x.favorite } : x);
    setProjects(next); // optimistic
    try { await api(`/api/projects/${p.id}`, { method: 'PUT', body: { favorite: !p.favorite } }); }
    catch { setProjects(projects); }
  }

  async function remove(p) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const prev = projects;
    setProjects(projects.filter(x => x.id !== p.id));
    try { await api(`/api/projects/${p.id}`, { method: 'DELETE' }); }
    catch { setProjects(prev); }
  }

  function startEdit(p) {
    setEditing(p.id);
    setForm({ name: p.name, description: p.description, key: p.key, scale: p.scale, tempo: p.tempo, status: p.status });
  }
  async function saveEdit() {
    const prev = projects;
    setProjects(projects.map(x => x.id === editing ? { ...x, ...form } : x));
    setEditing(null);
    try { await api(`/api/projects/${editing}`, { method: 'PUT', body: form }); }
    catch { setProjects(prev); }
  }

  function play(p) {
    setPlaying(p.id);
    playNotes(p.melodyNotes?.length ? p.melodyNotes : p.midiNotes, { tempo: p.tempo, onEnd: () => setPlaying(null) });
  }

  if (err) return <div style={{ color: '#fca5a5' }}>{err}</div>;
  if (!projects) return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><Skeleton h={44} /><Skeleton h={120} /><Skeleton h={120} /></div>;

  const shown = projects.filter(p => filter === 'all' ? true : filter === 'fav' ? p.favorite : p.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Projects</h1>
          <p style={{ color: '#71717a', margin: '4px 0 0', fontSize: 14 }}>{projects.length} project{projects.length !== 1 ? 's' : ''} in your library</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all','All'],['draft','Drafts'],['published','Published'],['fav','★ Favorites']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ padding: '7px 14px', borderRadius: 99, border: '1px solid #27272a', background: filter === v ? '#a3e635' : '#131316', color: filter === v ? '#0a0a0f' : '#d4d4d8', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty title="No projects here" desc={filter === 'all' ? 'Your converted melodies will appear here. Head to the Studio to create your first one.' : 'Nothing matches this filter yet.'} action={<a href="/studio" style={{ textDecoration: 'none' }}><Btn primary>Open Studio →</Btn></a>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {shown.map(p => (
            <Card key={p.id} style={{ padding: 16 }}>
              {editing === p.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} />
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inp, minHeight: 56 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} style={inp} placeholder="Key" />
                    <input value={form.scale} onChange={e => setForm({ ...form, scale: e.target.value })} style={inp} placeholder="Scale" />
                    <input type="number" value={form.tempo} onChange={e => setForm({ ...form, tempo: +e.target.value })} style={inp} />
                  </div>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
                    <option value="draft">Draft</option><option value="published">Published</option>
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn primary onClick={saveEdit} style={{ flex: 1 }}>Save</Btn>
                    <Btn ghost onClick={() => setEditing(null)} style={{ flex: 1 }}>Cancel</Btn>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>{p.name}</div>
                    <button onClick={() => toggleFav(p)} title="Favorite" style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: p.favorite ? '#facc15' : '#52525b' }}>{p.favorite ? '★' : '☆'}</button>
                  </div>
                  <div style={{ fontSize: 12, color: '#71717a', marginBottom: 10, minHeight: 32 }}>{p.description || 'No description'}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    <Badge>{p.key} {p.scale}</Badge>
                    <Badge>{p.tempo} BPM</Badge>
                    <Badge color={p.status === 'published' ? '#14532d' : '#27272a'} text={p.status === 'published' ? '#86efac' : '#d4d4d8'}>{p.status}</Badge>
                    <Badge>{p.melodyNotes?.length || 0} notes</Badge>
                  </div>
                  <PianoRoll notes={p.melodyNotes?.length ? p.melodyNotes : p.midiNotes} height={70} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <Btn onClick={() => play(p)} style={{ flex: 1 }}>{playing === p.id ? 'Playing…' : '▶ Play'}</Btn>
                    <Btn ghost onClick={() => startEdit(p)} style={{ flex: 1 }}>Edit</Btn>
                    <Btn danger onClick={() => remove(p)}>Delete</Btn>
                  </div>
                  <div style={{ fontSize: 11, color: '#52525b', marginTop: 8 }}>Updated {new Date(p.updatedAt).toLocaleDateString()}</div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const inp = { width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid #27272a', background: '#0a0a0f', color: '#fff', fontSize: 13, outline: 'none' };
