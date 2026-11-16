import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { api, getToken, setToken } from './lib/api.js';
import Dashboard from './pages/Dashboard.jsx';
import Studio from './pages/Studio.jsx';
import Projects from './pages/Projects.jsx';
import Presets from './pages/Presets.jsx';
import Plugins from './pages/Plugins.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◧' },
  { to: '/studio', label: 'Studio', icon: '♪' },
  { to: '/projects', label: 'Projects', icon: '▤' },
  { to: '/presets', label: 'Presets', icon: '◈' },
  { to: '/plugins', label: 'VST Plugins', icon: '⬡' },
];

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@relay.studio');
  const [password, setPassword] = useState('demo1234');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login' ? { email, password } : { name, email, password };
      const data = await api(path, { method: 'POST', body });
      setToken(data.token);
      onAuth(data.user);
    } catch (e) {
      setErr(e.message);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'radial-gradient(1200px 600px at 20% -10%, #1a2e05 0%, #0a0a0f 55%), #0a0a0f' }}>
      <div style={{ flex: 1, padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#a3e635', display: 'grid', placeItems: 'center', fontSize: 24, color: '#0a0a0f', fontWeight: 800 }}>♪</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>Relay</div>
            <div style={{ fontSize: 12, color: '#a1a1aa', letterSpacing: 1.5, textTransform: 'uppercase' }}>MIDI → Melody VST Studio</div>
          </div>
        </div>
        <h1 style={{ fontSize: 44, lineHeight: 1.05, fontWeight: 800, letterSpacing: -1.5, margin: '0 0 16px' }}>
          Turn any MIDI sketch<br />into a <span style={{ color: '#a3e635' }}>singable melody.</span>
        </h1>
        <p style={{ color: '#a1a1aa', fontSize: 16, lineHeight: 1.6, maxWidth: 480, margin: '0 0 28px' }}>
          Upload a MIDI file, pick a scale, and let MelodyForge quantize, harmonize and humanize it in real time — then export back to your DAW as VST3-ready MIDI.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['Scale-aware quantize', 'Harmony engine', 'Humanize timing', 'MIDI export'].map(f => (
            <span key={f} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 99, border: '1px solid #27272a', background: '#18181b', color: '#d4d4d8' }}>{f}</span>
          ))}
        </div>
        <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 480 }}>
          {[['48k+', 'Producers'], ['120+', 'Factory presets'], ['4.9★', 'Avg. rating']].map(([v, l]) => (
            <div key={l} style={{ background: '#131316', border: '1px solid #27272a', borderRadius: 14, padding: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{v}</div>
              <div style={{ fontSize: 12, color: '#71717a' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: 420, padding: 24, display: 'flex', alignItems: 'center' }}>
        <form onSubmit={submit} style={{ width: '100%', background: '#131316', border: '1px solid #27272a', borderRadius: 20, padding: 28 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>{mode === 'login' ? 'Welcome back' : 'Create your studio'}</h2>
          <p style={{ color: '#71717a', fontSize: 13, margin: '0 0 20px' }}>{mode === 'login' ? 'Sign in to continue to your dashboard.' : 'Start converting MIDI in seconds.'}</p>
          {mode === 'register' && (
            <label style={{ display: 'block', fontSize: 12, color: '#a1a1aa', marginBottom: 12 }}>
              Artist name
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nova Waves" required style={inp} />
            </label>
          )}
          <label style={{ display: 'block', fontSize: 12, color: '#a1a1aa', marginBottom: 12 }}>
            Email
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@studio.com" type="email" required style={inp} />
          </label>
          <label style={{ display: 'block', fontSize: 12, color: '#a1a1aa', marginBottom: 16 }}>
            Password
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" required style={inp} />
          </label>
          {err && <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', padding: '10px 12px', borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <button disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: loading ? '#3f6212' : '#a3e635', color: '#0a0a0f', fontWeight: 800, fontSize: 14, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in →' : 'Create account →'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: '#71717a' }}>
            {mode === 'login' ? <>No account? <button type="button" onClick={() => setMode('register')} style={linkBtn}>Register</button></> : <>Have an account? <button type="button" onClick={() => setMode('login')} style={linkBtn}>Sign in</button></>}
          </div>
          <div style={{ marginTop: 16, padding: 12, background: '#0a0a0f', borderRadius: 10, fontSize: 12, color: '#71717a', textAlign: 'center' }}>
            Demo: <span className="mono">demo@relay.studio / demo1234</span>
          </div>
        </form>
      </div>
    </div>
  );
}

const inp = { width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid #27272a', background: '#0a0a0f', color: '#fff', fontSize: 14, outline: 'none' };
const linkBtn = { background: 'none', border: 'none', color: '#a3e635', fontWeight: 700, cursor: 'pointer', fontSize: 13 };

function Shell({ user, onLogout }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: '#0f0f12', borderRight: '1px solid #1f1f23', padding: 20, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }} className="sidebar">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#fff', marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#a3e635', display: 'grid', placeItems: 'center', fontSize: 20, color: '#0a0a0f', fontWeight: 800 }}>♪</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, lineHeight: 1 }}>Relay</div>
            <div style={{ fontSize: 10, color: '#71717a', letterSpacing: 1.2, textTransform: 'uppercase' }}>VST Studio</div>
          </div>
        </Link>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {NAV.map(n => {
            const active = n.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} onClick={() => setMobileNav(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: active ? 700 : 500, color: active ? '#0a0a0f' : '#a1a1aa', background: active ? '#a3e635' : 'transparent' }}>
                <span style={{ width: 20, textAlign: 'center' }}>{n.icon}</span>{n.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ background: '#131316', border: '1px solid #27272a', borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>MelodyForge Pro</div>
          <div style={{ fontSize: 12, color: '#71717a', marginBottom: 10 }}>v3.2.1 · VST3 installed</div>
          <button onClick={() => navigate('/studio')} style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: '#a3e635', color: '#0a0a0f', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Open Studio →</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 12, background: '#131316', border: '1px solid #27272a' }}>
          <div style={{ width: 34, height: 34, borderRadius: 99, background: '#27272a', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12 }}>{user?.avatar || 'U'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
          </div>
          <button onClick={onLogout} title="Sign out" style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 16 }}>⏻</button>
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0, padding: '28px 32px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/presets" element={<Presets />} />
          <Route path="/plugins" element={<Plugins />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const d = await api('/api/auth/me');
          setUser(d.user);
        } catch { setToken(null); }
      }
      setBooting(false);
    })();
  }, []);

  if (booting) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#71717a' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, marginBottom: 8 }}>♪</div>Loading studio…</div></div>;
  if (!user) return <AuthScreen onAuth={setUser} />;
  return <Shell user={user} onLogout={() => { setToken(null); setUser(null); }} />;
}
