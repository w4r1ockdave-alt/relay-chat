import React from 'react';

export function Card({ children, style }) {
  return <div style={{ background: '#131316', border: '1px solid #27272a', borderRadius: 16, padding: 20, ...style }}>{children}</div>;
}

export function Stat({ label, value, sub }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 12, color: '#71717a', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

export function Empty({ title, desc, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed #27272a', borderRadius: 16, background: '#0f0f12' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>♪</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{title}</div>
      <div style={{ color: '#71717a', fontSize: 13, maxWidth: 360, margin: '0 auto 16px' }}>{desc}</div>
      {action}
    </div>
  );
}

export function Skeleton({ h = 80 }) {
  return <div style={{ height: h, borderRadius: 12, background: 'linear-gradient(90deg,#18181b 25%,#27272a 50%,#18181b 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s infinite' }}><style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style></div>;
}

export function Badge({ children, color = '#27272a', text = '#d4d4d8' }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: color, color: text }}>{children}</span>;
}

export function Btn({ children, onClick, primary, ghost, danger, disabled, style }) {
  const base = { padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', border: '1px solid transparent', opacity: disabled ? 0.5 : 1, ...style };
  if (primary) return <button onClick={onClick} disabled={disabled} style={{ ...base, background: '#a3e635', color: '#0a0a0f' }}>{children}</button>;
  if (danger) return <button onClick={onClick} disabled={disabled} style={{ ...base, background: '#450a0a', color: '#fca5a5', borderColor: '#7f1d1d' }}>{children}</button>;
  if (ghost) return <button onClick={onClick} disabled={disabled} style={{ ...base, background: 'transparent', color: '#d4d4d8', borderColor: '#27272a' }}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={{ ...base, background: '#27272a', color: '#fff' }}>{children}</button>;
}

export function PianoRoll({ notes, color = '#a3e635', height = 160, label }) {
  if (!notes || notes.length === 0) return <div style={{ height, display: 'grid', placeItems: 'center', color: '#52525b', fontSize: 13, border: '1px dashed #27272a', borderRadius: 12 }}>No notes</div>;
  const minMidi = Math.min(...notes.map(n => n.midi)) - 2;
  const maxMidi = Math.max(...notes.map(n => n.midi)) + 2;
  const maxTime = Math.max(...notes.map(n => n.time + (n.duration || 0.4))) + 0.5;
  const range = Math.max(1, maxMidi - minMidi);
  const W = 100, H = 100;
  return (
    <div>
      {label && <div style={{ fontSize: 11, color: '#71717a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{label} · {notes.length} notes</div>}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height, background: '#0a0a0f', border: '1px solid #27272a', borderRadius: 12, display: 'block' }}>
        {Array.from({ length: range + 1 }).map((_, i) => (
          <line key={i} x1="0" x2={W} y1={(i / range) * H} y2={(i / range) * H} stroke="#1f1f23" strokeWidth="0.3" />
        ))}
        {notes.map((n, i) => {
          const x = (n.time / maxTime) * W;
          const w = Math.max(1.2, ((n.duration || 0.4) / maxTime) * W);
          const y = ((maxMidi - n.midi) / range) * H;
          const h = Math.max(2, (H / range) * 0.7);
          return <rect key={i} x={x} y={y} width={w} height={h} rx="0.6" fill={color} opacity={0.9} />;
        })}
      </svg>
    </div>
  );
}
