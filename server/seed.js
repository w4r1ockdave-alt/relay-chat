import bcrypt from 'bcryptjs';
import { readDB, writeDB, uid } from './db.js';

const db = readDB();

// Demo user
let demo = db.users.find(u => u.email === 'demo@relay.studio');
if (!demo) {
  demo = {
    id: uid('usr'),
    name: 'Demo Producer',
    email: 'demo@relay.studio',
    passwordHash: bcrypt.hashSync('demo1234', 10),
    avatar: 'DP',
    role: 'producer',
    createdAt: new Date().toISOString(),
  };
  db.users.push(demo);
  console.log('Created demo user');
}

// Plugins catalog (global)
if (!db.plugins || db.plugins.length === 0) {
  db.plugins = [
    { id: 'plg_melodyforge', name: 'MelodyForge Pro', vendor: 'Relay Audio', category: 'Melody', version: '3.2.1', rating: 4.9, downloads: 48200, description: 'AI-assisted MIDI-to-melody engine with scale-aware harmonization, humanization and 120+ factory presets.', params: { scale: 'C Major', quantize: 75, humanize: 32, harmony: 'thirds' }, installed: true, price: 'Free', formats: ['VST3', 'AU'] },
    { id: 'plg_chordlens', name: 'ChordLens', vendor: 'Relay Audio', category: 'Harmony', version: '2.8.0', rating: 4.8, downloads: 31900, description: 'Real-time chord detection and re-harmonization for any MIDI stream. Drag-and-drop chord maps.', params: { scale: 'A Minor', quantize: 60, humanize: 20, harmony: 'triads' }, installed: true, price: 'Free', formats: ['VST3'] },
    { id: 'plg_groovepulse', name: 'GroovePulse', vendor: 'Relay Audio', category: 'Rhythm', version: '1.9.4', rating: 4.7, downloads: 21400, description: 'Swing, shuffle and micro-timing groove templates extracted from your own takes.', params: { scale: 'G Major', quantize: 80, humanize: 45, harmony: 'off' }, installed: false, price: '$49', formats: ['VST3', 'AU'] },
    { id: 'plg_arpweaver', name: 'ArpWeaver', vendor: 'Relay Audio', category: 'Arpeggiator', version: '2.1.0', rating: 4.6, downloads: 18750, description: 'Turn any chord into evolving arpeggios with ratcheting, strumming and probability gates.', params: { scale: 'D Minor', quantize: 70, humanize: 15, harmony: 'arpeggio' }, installed: false, price: '$39', formats: ['VST3'] },
    { id: 'plg_bassline', name: 'Bassline AI', vendor: 'Relay Audio', category: 'Bass', version: '1.4.2', rating: 4.8, downloads: 15300, description: 'Generates locked-in basslines from kick patterns and chord roots. Sidechain-aware.', params: { scale: 'F Major', quantize: 85, humanize: 25, harmony: 'roots' }, installed: false, price: '$59', formats: ['VST3', 'AU'] },
    { id: 'plg_vocalise', name: 'Vocalise', vendor: 'Relay Audio', category: 'Melody', version: '1.2.0', rating: 4.5, downloads: 9800, description: 'Singable melody lines with breath, legato and vibrato shaping for vocal chops.', params: { scale: 'E Minor', quantize: 65, humanize: 50, harmony: 'thirds' }, installed: false, price: '$79', formats: ['VST3'] },
  ];
  console.log('Seeded plugins');
}

// Demo projects for demo user
const demoProjects = [
  {
    name: 'Neon Skyline — Main Theme',
    description: 'Synthwave lead converted from a rough MIDI sketch. Quantized to C Major with wide harmony.',
    key: 'C', scale: 'Major', tempo: 112, status: 'published', favorite: true,
    midiNotes: [
      { midi: 60, time: 0, duration: 0.45, velocity: 96 }, { midi: 64, time: 0.5, duration: 0.45, velocity: 92 },
      { midi: 67, time: 1.0, duration: 0.9, velocity: 100 }, { midi: 72, time: 2.0, duration: 0.45, velocity: 95 },
      { midi: 71, time: 2.5, duration: 0.45, velocity: 90 }, { midi: 67, time: 3.0, duration: 0.9, velocity: 88 },
      { midi: 65, time: 4.0, duration: 0.45, velocity: 93 }, { midi: 69, time: 4.5, duration: 0.45, velocity: 91 },
      { midi: 72, time: 5.0, duration: 1.4, velocity: 102 },
    ],
    melodyNotes: [
      { midi: 60, time: 0, duration: 0.45, velocity: 96 }, { midi: 64, time: 0.5, duration: 0.45, velocity: 92 },
      { midi: 67, time: 1.0, duration: 0.9, velocity: 100 }, { midi: 72, time: 2.0, duration: 0.45, velocity: 95 },
      { midi: 76, time: 2.5, duration: 0.45, velocity: 90 }, { midi: 72, time: 3.0, duration: 0.9, velocity: 88 },
      { midi: 69, time: 4.0, duration: 0.45, velocity: 93 }, { midi: 72, time: 4.5, duration: 0.45, velocity: 91 },
      { midi: 79, time: 5.0, duration: 1.4, velocity: 102 },
    ],
  },
  {
    name: 'Midnight Lo-Fi Sketch',
    description: 'Dusty piano loop humanized with GroovePulse timing. A Minor pentatonic.',
    key: 'A', scale: 'Minor', tempo: 82, status: 'draft', favorite: false,
    midiNotes: [
      { midi: 57, time: 0, duration: 0.6, velocity: 80 }, { midi: 60, time: 0.75, duration: 0.5, velocity: 76 },
      { midi: 64, time: 1.5, duration: 0.8, velocity: 82 }, { midi: 62, time: 2.5, duration: 0.6, velocity: 78 },
      { midi: 60, time: 3.25, duration: 0.5, velocity: 74 }, { midi: 57, time: 4.0, duration: 1.2, velocity: 84 },
    ],
    melodyNotes: [
      { midi: 57, time: 0.02, duration: 0.6, velocity: 80 }, { midi: 60, time: 0.78, duration: 0.5, velocity: 76 },
      { midi: 64, time: 1.53, duration: 0.8, velocity: 82 }, { midi: 65, time: 2.53, duration: 0.6, velocity: 78 },
      { midi: 60, time: 3.28, duration: 0.5, velocity: 74 }, { midi: 57, time: 4.03, duration: 1.2, velocity: 84 },
    ],
  },
  {
    name: 'Festival Drop — Chord Stabs',
    description: 'EDM chord progression turned into a driving top-line. D Minor, 128 BPM.',
    key: 'D', scale: 'Minor', tempo: 128, status: 'published', favorite: true,
    midiNotes: [
      { midi: 50, time: 0, duration: 0.4, velocity: 110 }, { midi: 53, time: 0, duration: 0.4, velocity: 110 },
      { midi: 57, time: 0, duration: 0.4, velocity: 110 }, { midi: 62, time: 0.5, duration: 0.4, velocity: 108 },
      { midi: 65, time: 0.5, duration: 0.4, velocity: 108 }, { midi: 69, time: 0.5, duration: 0.4, velocity: 108 },
      { midi: 58, time: 1.0, duration: 0.4, velocity: 112 }, { midi: 62, time: 1.0, duration: 0.4, velocity: 112 },
      { midi: 65, time: 1.0, duration: 0.4, velocity: 112 },
    ],
    melodyNotes: [
      { midi: 62, time: 0, duration: 0.35, velocity: 110 }, { midi: 65, time: 0.5, duration: 0.35, velocity: 108 },
      { midi: 69, time: 1.0, duration: 0.35, velocity: 112 }, { midi: 70, time: 1.5, duration: 0.35, velocity: 109 },
      { midi: 74, time: 2.0, duration: 0.7, velocity: 115 },
    ],
  },
  {
    name: 'Ambient Pad — Generative',
    description: 'Slow evolving pad from a single held chord. ArpWeaver pattern, F Major.',
    key: 'F', scale: 'Major', tempo: 72, status: 'draft', favorite: false,
    midiNotes: [
      { midi: 53, time: 0, duration: 3.0, velocity: 70 }, { midi: 57, time: 0, duration: 3.0, velocity: 70 },
      { midi: 60, time: 0, duration: 3.0, velocity: 70 }, { midi: 65, time: 0, duration: 3.0, velocity: 70 },
    ],
    melodyNotes: [
      { midi: 65, time: 0, duration: 0.8, velocity: 72 }, { midi: 69, time: 0.8, duration: 0.8, velocity: 70 },
      { midi: 72, time: 1.6, duration: 0.8, velocity: 74 }, { midi: 77, time: 2.4, duration: 1.2, velocity: 76 },
    ],
  },
];

const existingNames = new Set(db.projects.filter(p => p.userId === demo.id).map(p => p.name));
for (const p of demoProjects) {
  if (!existingNames.has(p.name)) {
    db.projects.push({
      id: uid('prj'),
      userId: demo.id,
      ...p,
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 6).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

// Demo presets
if (!db.presets.some(p => p.userId === demo.id)) {
  db.presets.push(
    { id: uid('pst'), userId: demo.id, name: 'Synthwave Lead', params: { scale: 'C Major', quantize: 75, humanize: 32, harmony: 'thirds', tempo: 112 }, createdAt: new Date().toISOString() },
    { id: uid('pst'), userId: demo.id, name: 'Lo-Fi Keys', params: { scale: 'A Minor', quantize: 60, humanize: 50, harmony: 'off', tempo: 82 }, createdAt: new Date().toISOString() },
    { id: uid('pst'), userId: demo.id, name: 'Festival Top-Line', params: { scale: 'D Minor', quantize: 85, humanize: 15, harmony: 'arpeggio', tempo: 128 }, createdAt: new Date().toISOString() },
  );
}

writeDB(db);
console.log('Seed complete. Demo login: demo@relay.studio / demo1234');
