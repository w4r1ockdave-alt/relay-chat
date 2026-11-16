import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import pkg from '@tonejs/midi';
const { Midi } = pkg;
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { readDB, writeDB, uid } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'relay-melody-secret-change-in-prod';

if (process.env.RELAY_DESKTOP === '1') {
  // Reject browser requests from other origins and DNS-rebinding hostnames.
  app.use((req, res, next) => {
    const expected = '127.0.0.1:31477';
    const origin = req.get('Origin');
    if (req.get('Host') !== expected || (origin && origin !== `http://${expected}`)) {
      return res.status(403).send('Forbidden');
    }
    next();
  });
} else {
  app.use(cors());
}
app.use(express.json({ limit: '10mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ---------- Auth helpers ----------
function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, avatar: u.avatar || u.name?.slice(0,2).toUpperCase() || 'U', role: u.role || 'producer', createdAt: u.createdAt };
}

// ---------- Music theory helpers ----------
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SCALES = {
  Major: [0,2,4,5,7,9,11],
  Minor: [0,2,3,5,7,8,10],
  'Minor Pentatonic': [0,3,5,7,10],
  'Major Pentatonic': [0,2,4,7,9],
  Dorian: [0,2,3,5,7,9,10],
  Phrygian: [0,1,3,5,7,8,10],
  Lydian: [0,2,4,6,7,9,11],
  Mixolydian: [0,2,4,5,7,9,10],
};
const KEY_TO_PC = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11 };

function quantizeToScale(midi, rootPc, scaleIntervals) {
  const pc = ((midi % 12) + 12) % 12;
  let best = midi, bestDist = 99;
  for (let oct = -1; oct <= 1; oct++) {
    for (const iv of scaleIntervals) {
      const targetPc = (rootPc + iv) % 12;
      let candidate = midi + (targetPc - pc + 12) % 12 + oct * 0;
      // find nearest candidate
      const diff = ((targetPc - pc + 18) % 12) - 6;
      candidate = midi + diff;
      const d = Math.abs(diff);
      if (d < bestDist) { bestDist = d; best = candidate; }
    }
  }
  return best;
}

function generateMelody(notes, { key = 'C', scale = 'Major', quantize = 75, humanize = 30, harmony = 'thirds', tempo = 120 } = {}) {
  const rootPc = KEY_TO_PC[key] ?? 0;
  const intervals = SCALES[scale] || SCALES.Major;
  const q = Math.min(100, Math.max(0, quantize)) / 100;
  const h = Math.min(100, Math.max(0, humanize)) / 100;
  const beat = 60 / tempo; // seconds per beat
  const grid = beat / 2; // 8th notes

  // Sort by time, dedupe chords -> take top note per onset for melody line
  const sorted = [...notes].sort((a,b) => a.time - b.time);
  const byTime = new Map();
  for (const n of sorted) {
    const t = Math.round(n.time / grid) * grid;
    if (!byTime.has(t)) byTime.set(t, []);
    byTime.get(t).push(n);
  }
  const onsets = [...byTime.entries()].sort((a,b) => a[0]-b[0]);

  let melody = [];
  let prevMidi = null;
  for (const [t, group] of onsets) {
    // pick highest note as melody seed
    let seed = group.reduce((a,b) => (b.midi > a.midi ? b : a));
    let m = seed.midi;
    // quantize toward scale
    const snapped = quantizeToScale(m, rootPc, intervals);
    m = Math.round(m + (snapped - m) * q);
    // melodic smoothing: avoid huge leaps > octave by folding
    if (prevMidi !== null) {
      while (m - prevMidi > 12) m -= 12;
      while (prevMidi - m > 12) m += 12;
    }
    // harmony variations
    let extra = [];
    if (harmony === 'thirds' && prevMidi !== null) {
      const idx = intervals.indexOf(((m - rootPc) % 12 + 12) % 12);
      if (idx >= 0) {
        const thirdIv = intervals[(idx + 2) % intervals.length];
        const third = m + (thirdIv - intervals[idx] + 12) % 12 - 0;
        // simpler: +3 or +4 semitones snapped
        let thirdMidi = quantizeToScale(m + 4, rootPc, intervals);
        extra.push({ midi: thirdMidi, time: t, duration: seed.duration * 0.9, velocity: Math.max(40, seed.velocity - 18) });
      }
    } else if (harmony === 'arpeggio') {
      extra.push({ midi: m + 7, time: t + seed.duration * 0.5, duration: seed.duration * 0.4, velocity: Math.max(40, seed.velocity - 12) });
      extra.push({ midi: m + 12, time: t + seed.duration * 0.75, duration: seed.duration * 0.3, velocity: Math.max(40, seed.velocity - 20) });
    } else if (harmony === 'roots') {
      extra.push({ midi: m - 12, time: t, duration: seed.duration, velocity: Math.max(50, seed.velocity - 10) });
    }
    // humanize timing + velocity
    const jitter = (Math.random() - 0.5) * 0.06 * h * beat;
    const velJitter = Math.round((Math.random() - 0.5) * 16 * h);
    melody.push({ midi: m, time: Math.max(0, +(t + jitter).toFixed(3)), duration: +seed.duration.toFixed(3), velocity: Math.min(127, Math.max(1, seed.velocity + velJitter)) });
    melody.push(...extra.map(e => ({ ...e, time: +e.time.toFixed(3), duration: +e.duration.toFixed(3) })));
    prevMidi = m;
  }
  // If input was a single chord / pad, expand into arpeggio melody
  if (melody.length <= 2 && notes.length > 0) {
    const base = notes[0].midi;
    const steps = [0, 4, 7, 12, 16, 12, 7, 4];
    melody = steps.map((s, i) => ({
      midi: quantizeToScale(base + s, rootPc, intervals),
      time: +(i * beat * 0.5).toFixed(3),
      duration: +(beat * 0.45).toFixed(3),
      velocity: 80 + Math.round(Math.random() * 20),
    }));
  }
  return melody.sort((a,b) => a.time - b.time);
}

// ---------- Routes ----------
app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Auth
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const db = readDB();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ error: 'Email already registered' });
  const user = { id: uid('usr'), name, email: email.toLowerCase(), passwordHash: bcrypt.hashSync(password, 10), avatar: name.slice(0,2).toUpperCase(), role: 'producer', createdAt: new Date().toISOString() };
  db.users.push(user);
  writeDB(db);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.get('/api/auth/me', auth, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

// MIDI parse + generate
app.post('/api/midi/parse', auth, upload.single('file'), (req, res) => {
  try {
    let notes = [];
    let name = req.body?.name || 'Untitled MIDI';
    let tempo = 120;
    if (req.file) {
      const midi = new Midi(req.file.buffer);
      name = req.file.originalname.replace(/\.midi?$/i, '');
      tempo = Math.round(midi.header.tempos?.[0]?.bpm || 120);
      for (const track of midi.tracks) {
        for (const n of track.notes) {
          notes.push({ midi: n.midi, time: +n.time.toFixed(3), duration: +n.duration.toFixed(3), velocity: n.velocity || 96 });
        }
      }
      notes.sort((a,b) => a.time - b.time);
    } else if (Array.isArray(req.body?.notes)) {
      notes = req.body.notes;
    } else {
      return res.status(400).json({ error: 'Upload a .mid file or provide notes array' });
    }
    if (notes.length === 0) return res.status(400).json({ error: 'No notes found in MIDI file' });
    res.json({ name, tempo, notes, count: notes.length });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not parse MIDI file: ' + e.message });
  }
});

app.post('/api/midi/generate', auth, (req, res) => {
  const { notes, key, scale, quantize, humanize, harmony, tempo } = req.body || {};
  if (!Array.isArray(notes) || notes.length === 0) return res.status(400).json({ error: 'Notes array required' });
  const melody = generateMelody(notes, { key, scale, quantize, humanize, harmony, tempo });
  res.json({ melody, count: melody.length });
});

app.post('/api/midi/export', auth, (req, res) => {
  const { notes, name = 'melody', tempo = 120 } = req.body || {};
  if (!Array.isArray(notes) || notes.length === 0) return res.status(400).json({ error: 'Notes required' });
  try {
    const midi = new Midi();
    midi.header.setTempo(tempo);
    const track = midi.addTrack(name);
    for (const n of notes) {
      track.addNote({ midi: n.midi, time: n.time, duration: n.duration || 0.4, velocity: (n.velocity || 96) / 127 });
    }
    const buf = midi.toArray();
    res.setHeader('Content-Type', 'audio/midi');
    res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/[^\w\-]+/g,'_')}.mid"`);
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Projects CRUD
app.get('/api/projects', auth, (req, res) => {
  const db = readDB();
  const mine = db.projects.filter(p => p.userId === req.user.id).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ projects: mine });
});
app.post('/api/projects', auth, (req, res) => {
  const { name, description, key, scale, tempo, midiNotes, melodyNotes, status, favorite } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name required' });
  const db = readDB();
  const p = { id: uid('prj'), userId: req.user.id, name, description: description || '', key: key || 'C', scale: scale || 'Major', tempo: tempo || 120, midiNotes: midiNotes || [], melodyNotes: melodyNotes || [], status: status || 'draft', favorite: !!favorite, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.projects.push(p);
  writeDB(db);
  res.status(201).json({ project: p });
});
app.get('/api/projects/:id', auth, (req, res) => {
  const db = readDB();
  const p = db.projects.find(x => x.id === req.params.id && x.userId === req.user.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  res.json({ project: p });
});
app.put('/api/projects/:id', auth, (req, res) => {
  const db = readDB();
  const idx = db.projects.findIndex(x => x.id === req.params.id && x.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Project not found' });
  const allowed = ['name','description','key','scale','tempo','midiNotes','melodyNotes','status','favorite'];
  for (const k of allowed) if (k in req.body) db.projects[idx][k] = req.body[k];
  db.projects[idx].updatedAt = new Date().toISOString();
  writeDB(db);
  res.json({ project: db.projects[idx] });
});
app.delete('/api/projects/:id', auth, (req, res) => {
  const db = readDB();
  const idx = db.projects.findIndex(x => x.id === req.params.id && x.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Project not found' });
  db.projects.splice(idx, 1);
  writeDB(db);
  res.json({ ok: true });
});

// Presets CRUD
app.get('/api/presets', auth, (req, res) => {
  const db = readDB();
  res.json({ presets: db.presets.filter(p => p.userId === req.user.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});
app.post('/api/presets', auth, (req, res) => {
  const { name, params } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name required' });
  const db = readDB();
  const p = { id: uid('pst'), userId: req.user.id, name, params: params || {}, createdAt: new Date().toISOString() };
  db.presets.push(p);
  writeDB(db);
  res.status(201).json({ preset: p });
});
app.put('/api/presets/:id', auth, (req, res) => {
  const db = readDB();
  const idx = db.presets.findIndex(x => x.id === req.params.id && x.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Preset not found' });
  if ('name' in req.body) db.presets[idx].name = req.body.name;
  if ('params' in req.body) db.presets[idx].params = req.body.params;
  writeDB(db);
  res.json({ preset: db.presets[idx] });
});
app.delete('/api/presets/:id', auth, (req, res) => {
  const db = readDB();
  const idx = db.presets.findIndex(x => x.id === req.params.id && x.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Preset not found' });
  db.presets.splice(idx, 1);
  writeDB(db);
  res.json({ ok: true });
});

// Plugins
app.get('/api/plugins', auth, (req, res) => {
  const db = readDB();
  res.json({ plugins: db.plugins || [] });
});
app.post('/api/plugins/:id/install', auth, (req, res) => {
  const db = readDB();
  const p = db.plugins.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Plugin not found' });
  p.installed = true;
  p.downloads = (p.downloads || 0) + 1;
  writeDB(db);
  res.json({ plugin: p });
});
app.post('/api/plugins/:id/uninstall', auth, (req, res) => {
  const db = readDB();
  const p = db.plugins.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Plugin not found' });
  p.installed = false;
  writeDB(db);
  res.json({ plugin: p });
});
app.put('/api/plugins/:id/params', auth, (req, res) => {
  const db = readDB();
  const p = db.plugins.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Plugin not found' });
  p.params = { ...p.params, ...(req.body.params || {}) };
  writeDB(db);
  res.json({ plugin: p });
});

// Dashboard stats
app.get('/api/dashboard', auth, (req, res) => {
  const db = readDB();
  const mine = db.projects.filter(p => p.userId === req.user.id);
  const totalNotes = mine.reduce((s,p) => s + (p.melodyNotes?.length || 0), 0);
  const published = mine.filter(p => p.status === 'published').length;
  const favorites = mine.filter(p => p.favorite).length;
  const installed = (db.plugins || []).filter(p => p.installed).length;
  res.json({
    stats: { projects: mine.length, published, favorites, totalNotes, installedPlugins: installed, presets: db.presets.filter(p => p.userId === req.user.id).length },
    recent: mine.slice(0, 5),
    plugins: (db.plugins || []).slice(0, 4),
  });
});

// Serve client in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export { app };

// The desktop shell imports the app and binds it to loopback itself.
if (process.env.RELAY_DESKTOP !== '1') {
  app.listen(PORT, '0.0.0.0', () => console.log(`Relay API listening on :${PORT}`));
}
