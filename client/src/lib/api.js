const BASE = '';

export function getToken() {
  return localStorage.getItem('relay_token') || '';
}
export function setToken(t) {
  if (t) localStorage.setItem('relay_token', t);
  else localStorage.removeItem('relay_token');
}

export async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let body = opts.body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, body });
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res;
}

export const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export function midiName(m) {
  const n = NOTE_NAMES[((m % 12) + 12) % 12];
  const oct = Math.floor(m / 12) - 1;
  return `${n}${oct}`;
}
export function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return `${m}:${sec.padStart(4, '0')}`;
}
