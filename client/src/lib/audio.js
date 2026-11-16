// Tiny WebAudio synth for MIDI playback — no deps
let ctx = null;
let master = null;
let scheduled = [];

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function stopPlayback() {
  scheduled.forEach(id => clearTimeout(id));
  scheduled = [];
}

export function playNotes(notes, { tempo = 120, onEnd } = {}) {
  stopPlayback();
  const ac = ensureCtx();
  const startAt = ac.currentTime + 0.08;
  let maxEnd = startAt;
  for (const n of notes) {
    const t = startAt + n.time;
    const dur = Math.max(0.08, n.duration || 0.4);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const vel = (n.velocity || 96) / 127;
    osc.type = 'triangle';
    osc.frequency.value = midiToFreq(n.midi);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35 * vel, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    maxEnd = Math.max(maxEnd, t + dur);
  }
  const ms = Math.max(0, (maxEnd - ac.currentTime) * 1000 + 200);
  const id = setTimeout(() => { onEnd && onEnd(); }, ms);
  scheduled.push(id);
  return ms;
}
