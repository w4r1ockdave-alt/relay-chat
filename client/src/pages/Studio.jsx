import React, { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { Card, Btn, PianoRoll, Badge } from '../components/ui.jsx';
import { playNotes, stopPlayback } from '../lib/audio.js';

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SCALES = ['Major','Minor','Minor Pentatonic','Major Pentatonic','Dorian','Phrygian','Lydian','Mixolydian'];
const HARMONIES = ['off','thirds','arpeggio','roots'];

const DEMO_NOTES = [
  { midi: 60, time: 0, duration: 0.45, velocity: 96 }, { midi: 64, time: 0.5, duration: 0.45, velocity: 92 },
  { midi: 67, time: 1.0, duration: 0.9, velocity: 100 }, { midi: 72, time: 2.0, duration: 0.45, velocity: 95 },
  { midi: 71, time: 2.5, duration: 0.45, velocity: 90 }, { midi: 67, time: 3.0, duration: 0.9, velocity: 88 },
  { midi: 65, time: 4.0, duration: 0.45, velocity: 93 }, { midi: 69, time: 4.5, duration: 0.45, velocity: 91 },
  { midi: 72, time: 5.0, duration: 1.4, velocity: 102 },
];

export default function Studio() {
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [inputNotes, setInputNotes] = useState([]);
  const [melodyNotes, setMelodyNotes] = useState([]);
  const [name, setName] = useState('Untitled Melody');
  const [key, setKey] = useState('C');
  const [scale, setScale] = useState('Major');
  const [tempo, setTempo] = useState(120);
  const [quantize, setQuantize] = useState(75);
  const [humanize, setHumanize] = useState(30);
  const [harmony, setHarmony] = useState('thirds');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef();

  async function parseFile(f) {
    if (!f) return;
    setErr(''); setMsg(''); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const data = await api('/api/midi/parse', { method: 'POST', body: fd });
      setInputNotes(data.notes);
      setName(data.name || 'Untitled Melody');
      if (data.tempo) setTempo(data.tempo);
      setMelodyNotes([]);
      setMsg(`Parsed ${data.count} notes from ${f.name}`);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  function loadDemo() {
    setInputNotes(DEMO_NOTES);
    setName('Neon Skyline — Demo Sketch');
    setTempo(112); setKey('C'); setScale('Major');
    setMelodyNotes([]);
    setMsg('Demo MIDI loaded — hit Generate Melody');
    setErr('');
  }

  async function generate() {
    if (inputNotes.length === 0) { setErr('Upload a MIDI file or load the demo first.'); return; }
    setLoading(true); setErr(''); setMsg('');
    try {
      const data = await api('/api/midi/generate', { method: 'POST', body: { notes: inputNotes, key, scale, quantize, humanize, harmony, tempo } });
      setMelodyNotes(data.melody);
      setMsg(`Generated ${data.count} melody notes`);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function saveProject() {
    if (!name.trim()) { setErr('Give your project a name.'); return; }
    setLoading(true);
    try {
      await api('/api/projects', { method: 'POST', body: { name, description: `Converted with ${key} ${scale} · ${harmony} harmony`, key, scale, tempo, midiNotes: inputNotes, melodyNotes, status: 'draft' } });
      setMsg('Saved to Projects ✓');
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function exportMidi() {
    if (melodyNotes.length === 0) { setErr('Generate a melody first.'); return; }
    try {
      const res = await api('/api/midi/export', { method: 'POST', body: { notes: melodyNotes, name, tempo } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${name.replace(/[^\w\-]+/g, '_')}.mid`; a.click();
      URL.revokeObjectURL(url);
      setMsg('MIDI exported ✓');
    } catch (e) { setErr(e.message); }
  }

  function play(which) {
    const notes = which === 'input' ? inputNotes : melodyNotes;
    if (!notes.length) return;
    setPlaying(which);
    playNotes(notes, { tempo, onEnd: () => setPlaying(null) });
  }

  const sel = { padding: '9px 10px', borderRadius: 10, border: '1px solid #27272a', background: '#0a0a0f', color: '#fff', fontSize: 13, width: '100%' };
  const lbl = { fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 };

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Studio</h1>
      <p style={{ color: '#71717a', margin: '0 0 20px', fontSize: 14 }}>Upload MIDI → tune the engine → generate & export your melody.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' }} className="studio-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800 }}>1 · MIDI input</h3>
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); parseFile(f); } }}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${drag ? '#a3e635' : '#27272a'}`, borderRadius: 14, padding: 22, textAlign: 'center', cursor: 'pointer', background: drag ? '#1a2e05' : '#0a0a0f' }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>🎹</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{file ? file.name : 'Drop .mid file here or click to browse'}</div>
              <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>Max 5 MB · Standard MIDI files</div>
              <input ref={fileRef} type="file" accept=".mid,.midi" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); parseFile(f); } }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Btn ghost onClick={loadDemo} style={{ flex: 1 }}>Load demo MIDI</Btn>
              {inputNotes.length > 0 && <Btn ghost onClick={() => play('input')} style={{ flex: 1 }}>{playing === 'input' ? 'Playing…' : '▶ Play input'}</Btn>}
            </div>
            <label style={{ display: 'block', marginTop: 14 }}>
              <span style={lbl}>Project name</span>
              <input value={name} onChange={e => setName(e.target.value)} style={sel} />
            </label>
          </Card>

          <Card>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800 }}>2 · Melody engine</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label><span style={lbl}>Key</span><select value={key} onChange={e => setKey(e.target.value)} style={sel}>{KEYS.map(k => <option key={k}>{k}</option>)}</select></label>
              <label><span style={lbl}>Scale</span><select value={scale} onChange={e => setScale(e.target.value)} style={sel}>{SCALES.map(s => <option key={s}>{s}</option>)}</select></label>
              <label><span style={lbl}>Tempo (BPM)</span><input type="number" min="40" max="240" value={tempo} onChange={e => setTempo(+e.target.value)} style={sel} /></label>
              <label><span style={lbl}>Harmony</span><select value={harmony} onChange={e => setHarmony(e.target.value)} style={sel}>{HARMONIES.map(h => <option key={h}>{h}</option>)}</select></label>
            </div>
            <label style={{ display: 'block', marginTop: 14 }}>
              <span style={lbl}>Quantize strength — {quantize}%</span>
              <input type="range" min="0" max="100" value={quantize} onChange={e => setQuantize(+e.target.value)} style={{ width: '100%' }} />
            </label>
            <label style={{ display: 'block', marginTop: 10 }}>
              <span style={lbl}>Humanize — {humanize}%</span>
              <input type="range" min="0" max="100" value={humanize} onChange={e => setHumanize(+e.target.value)} style={{ width: '100%' }} />
            </label>
            <Btn primary onClick={generate} disabled={loading || inputNotes.length === 0} style={{ width: '100%', marginTop: 16, padding: '12px' }}>
              {loading ? 'Working…' : '♪ Generate melody'}
            </Btn>
          </Card>

          <Card>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800 }}>3 · Output</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Btn onClick={() => play('melody')} disabled={melodyNotes.length === 0} style={{ width: '100%' }}>{playing === 'melody' ? 'Playing…' : '▶ Play melody'}</Btn>
              <Btn ghost onClick={saveProject} disabled={loading || melodyNotes.length === 0} style={{ width: '100%' }}>Save as project</Btn>
              <Btn ghost onClick={exportMidi} disabled={melodyNotes.length === 0} style={{ width: '100%' }}>Export .mid</Btn>
              {melodyNotes.length > 0 && <Btn ghost onClick={stopPlayback} style={{ width: '100%' }}>■ Stop</Btn>}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {err && <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', padding: '12px 14px', borderRadius: 12, fontSize: 13 }}>{err}</div>}
          {msg && <div style={{ background: '#14532d', border: '1px solid #166534', color: '#86efac', padding: '12px 14px', borderRadius: 12, fontSize: 13 }}>{msg}</div>}

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Piano roll</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <Badge color="#1a2e05" text="#a3e635">Input · {inputNotes.length}</Badge>
                <Badge color="#27272a" text="#d4d4d8">Melody · {melodyNotes.length}</Badge>
              </div>
            </div>
            {inputNotes.length === 0 && melodyNotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 20px', border: '1px dashed #27272a', borderRadius: 12 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>♪</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Nothing here yet</div>
                <div style={{ color: '#71717a', fontSize: 13, maxWidth: 340, margin: '0 auto' }}>Upload a MIDI file or load the demo sketch to see your notes visualized as a piano roll.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <PianoRoll notes={inputNotes} color="#71717a" label="Original MIDI" height={130} />
                <PianoRoll notes={melodyNotes} color="#a3e635" label="Generated melody" height={160} />
              </div>
            )}
          </Card>

          <Card>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800 }}>Note inspector</h3>
            {melodyNotes.length === 0 ? (
              <div style={{ color: '#71717a', fontSize: 13 }}>Generate a melody to inspect its notes here.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ color: '#71717a', textAlign: 'left' }}><th style={{ padding: '6px 8px' }}>#</th><th>Note</th><th>MIDI</th><th>Time</th><th>Dur</th><th>Velocity</th></tr></thead>
                  <tbody>
                    {melodyNotes.slice(0, 24).map((n, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #1f1f23' }}>
                        <td style={{ padding: '6px 8px' }} className="mono">{i + 1}</td>
                        <td className="mono">{['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][((n.midi % 12) + 12) % 12]}{Math.floor(n.midi / 12) - 1}</td>
                        <td className="mono">{n.midi}</td>
                        <td className="mono">{n.time.toFixed(2)}s</td>
                        <td className="mono">{n.duration.toFixed(2)}s</td>
                        <td className="mono">{n.velocity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {melodyNotes.length > 24 && <div style={{ fontSize: 12, color: '#71717a', marginTop: 8 }}>+ {melodyNotes.length - 24} more notes</div>}
              </div>
            )}
          </Card>
        </div>
      </div>
      <style>{`@media (max-width: 960px){ .studio-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
