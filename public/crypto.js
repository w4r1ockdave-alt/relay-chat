'use strict';
// Šifrování na straně klienta. Z tajemství v odkazu (část za #) se pomocí HKDF
// odvodí dvě nezávislé hodnoty:
//   - ID místnosti (posílá se serveru; nelze z něj zpětně získat klíč)
//   - klíč AES-256-GCM (nikdy neopouští prohlížeč)
(function (root) {
  const subtle = (root.crypto || require('crypto').webcrypto).subtle;
  const rng = root.crypto || require('crypto').webcrypto;
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const SALT = enc.encode('relay-chat-v1');

  const toB64Url = (bytes) =>
    btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const fromB64Url = (s) =>
    Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

  function newSecret() {
    return toB64Url(rng.getRandomValues(new Uint8Array(32)));
  }

  async function deriveRoom(secret) {
    let raw;
    try {
      raw = fromB64Url(secret);
    } catch {
      throw new Error('Neplatný odkaz');
    }
    if (raw.length < 16) throw new Error('Neplatný odkaz');
    const base = await subtle.importKey('raw', raw, 'HKDF', false, ['deriveBits', 'deriveKey']);
    const hkdf = (info) => ({ name: 'HKDF', hash: 'SHA-256', salt: SALT, info: enc.encode(info) });
    const idBytes = new Uint8Array(await subtle.deriveBits(hkdf('room-id'), base, 128));
    const key = await subtle.deriveKey(hkdf('message-key'), base, { name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
    return { roomId: toHex(idBytes), aad: idBytes, key };
  }

  // Rámec: 12 bajtů IV || šifrový text s autentizační značkou
  async function seal(room, obj) {
    const iv = rng.getRandomValues(new Uint8Array(12));
    const ct = await subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: room.aad },
      room.key,
      enc.encode(JSON.stringify(obj))
    );
    const out = new Uint8Array(12 + ct.byteLength);
    out.set(iv);
    out.set(new Uint8Array(ct), 12);
    return out;
  }

  // Vrací null, pokud rámec nejde ověřit (cizí klíč, poškozená či podvržená data).
  async function open(room, frame) {
    const bytes = new Uint8Array(frame);
    if (bytes.length < 12 + 16) return null;
    try {
      const pt = await subtle.decrypt(
        { name: 'AES-GCM', iv: bytes.subarray(0, 12), additionalData: room.aad },
        room.key,
        bytes.subarray(12)
      );
      return JSON.parse(dec.decode(pt));
    } catch {
      return null;
    }
  }

  const api = { newSecret, deriveRoom, seal, open };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RelayCrypto = api;
})(typeof window !== 'undefined' ? window : globalThis);
