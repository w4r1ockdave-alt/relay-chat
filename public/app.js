'use strict';
(function () {
  const $ = (id) => document.getElementById(id);
  const lobby = $('lobby');
  const chat = $('chat');
  const log = $('log');
  const statusEl = $('status');
  const textInput = $('text');
  const nickInput = $('nick');

  const MAX_TEXT = 4000;
  let room = null; // { roomId, aad, key }
  let ws = null;
  let myId = null;
  let nick = '';
  let closing = false;
  let retry = 0;
  let peerCount = 1;
  const peers = new Map(); // id spojení -> přezdívka (z dešifrovaných zpráv)

  if (!window.isSecureContext || !window.crypto || !crypto.subtle) {
    document.body.innerHTML =
      '<main class="card"><h1>Relay Chat</h1><p>Šifrování vyžaduje zabezpečené připojení (HTTPS nebo localhost).</p></main>';
    return;
  }

  // ---------- lobby ----------
  function showLobby() {
    const invited = location.hash.length > 1;
    $('lobby-lead').textContent = invited
      ? 'Byli jste pozváni do šifrované místnosti.'
      : 'Vytvořte soukromou místnost a pošlete odkaz lidem, se kterými chcete mluvit.';
    $('lobby-submit').textContent = invited ? 'Vstoupit do místnosti' : 'Vytvořit místnost';
    nickInput.value = sessionStorage.getItem('nick') || '';
    chat.hidden = true;
    lobby.hidden = false;
    nickInput.focus();
  }

  $('lobby-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    nick = nickInput.value.trim().slice(0, 32);
    if (!nick) return;
    sessionStorage.setItem('nick', nick);
    if (location.hash.length <= 1) {
      history.replaceState(null, '', '#' + RelayCrypto.newSecret());
    }
    try {
      room = await RelayCrypto.deriveRoom(location.hash.slice(1));
    } catch (err) {
      alert('Odkaz na místnost je neplatný. Vytvoří se nová místnost.');
      history.replaceState(null, '', location.pathname);
      showLobby();
      return;
    }
    lobby.hidden = true;
    chat.hidden = false;
    log.textContent = '';
    addSystem('Místnost je šifrovaná end‑to‑end. Kdo má odkaz, může číst i psát – sdílejte ho bezpečně.');
    closing = false;
    connect();
    textInput.focus();
  });

  // ---------- spojení ----------
  function connect() {
    setStatus('Připojování…', 'warn');
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}/ws?room=${room.roomId}`);
    ws.binaryType = 'arraybuffer';

    ws.onmessage = async (ev) => {
      if (typeof ev.data === 'string') {
        let c;
        try {
          c = JSON.parse(ev.data);
        } catch {
          return;
        }
        onControl(c);
      } else {
        const msg = await RelayCrypto.open(room, ev.data);
        if (msg) onMessage(msg);
        else addSystem('Přijata zpráva, kterou nelze dešifrovat (zahozena).');
      }
    };

    ws.onclose = () => {
      if (closing) return;
      peers.clear();
      const delay = Math.min(15000, 1000 * 2 ** retry++);
      setStatus(`Odpojeno – nový pokus za ${Math.round(delay / 1000)} s`, 'bad');
      setTimeout(() => !closing && connect(), delay);
    };
  }

  function onControl(c) {
    if (c.t === 'welcome') {
      retry = 0;
      myId = c.id;
      peerCount = c.n;
      updateStatus();
      send({ type: 'hello' });
    } else if (c.t === 'join') {
      peerCount = c.n;
      updateStatus();
    } else if (c.t === 'leave') {
      peerCount = c.n;
      updateStatus();
      const name = peers.get(c.id);
      peers.delete(c.id);
      if (name) addSystem(`${name} odešel/odešla.`);
    } else if (c.t === 'error' && c.code === 'rate') {
      addSystem('Posíláte zprávy příliš rychle – poslední zpráva nebyla doručena.');
    }
  }

  function onMessage(m) {
    if (typeof m !== 'object' || m === null) return;
    const from = String(m.nick || 'Neznámý').slice(0, 32);
    const id = String(m.id || '');
    if (m.type === 'hello') {
      peers.set(id, from);
      addSystem(`${from} se připojil/a.`);
      send({ type: 'here' }); // ať nově příchozí ví, kdo v místnosti je
    } else if (m.type === 'here') {
      if (!peers.has(id)) {
        peers.set(id, from);
        addSystem(`${from} je v místnosti.`);
      }
    } else if (m.type === 'msg' && typeof m.text === 'string') {
      peers.set(id, from);
      addMessage(from, m.text.slice(0, MAX_TEXT), m.ts, false);
    }
  }

  async function send(payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    const frame = await RelayCrypto.seal(room, { ...payload, nick, id: myId, ts: Date.now() });
    if (ws.readyState !== WebSocket.OPEN) return false;
    ws.send(frame);
    return true;
  }

  // ---------- UI ----------
  $('send-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    if (!text) return;
    if (await send({ type: 'msg', text })) {
      addMessage(nick, text, Date.now(), true);
      textInput.value = '';
    } else {
      addSystem('Nejste připojeni – zpráva nebyla odeslána.');
    }
  });

  $('copy').addEventListener('click', async () => {
    const btn = $('copy');
    try {
      await navigator.clipboard.writeText(location.href);
      btn.textContent = 'Zkopírováno ✓';
    } catch {
      prompt('Zkopírujte odkaz:', location.href);
    }
    setTimeout(() => (btn.textContent = 'Kopírovat pozvánku'), 2000);
  });

  $('leave').addEventListener('click', () => {
    closing = true;
    if (ws) ws.close();
    peers.clear();
    room = null;
    history.replaceState(null, '', location.pathname);
    showLobby();
  });

  window.addEventListener('hashchange', () => location.reload());

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status ' + (cls || '');
  }
  function updateStatus() {
    setStatus(peerCount === 1 ? '🔒 Jste tu sami' : `🔒 V místnosti: ${peerCount}`, 'ok');
  }

  function append(li) {
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    log.appendChild(li);
    if (atBottom) log.scrollTop = log.scrollHeight;
  }
  function addSystem(text) {
    const li = document.createElement('li');
    li.className = 'system';
    li.textContent = text;
    append(li);
  }
  function addMessage(from, text, ts, mine) {
    const li = document.createElement('li');
    li.className = 'msg' + (mine ? ' mine' : '');
    const meta = document.createElement('div');
    meta.className = 'meta';
    const d = new Date(Number(ts) || Date.now());
    meta.textContent = `${from} · ${d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`;
    const body = document.createElement('div');
    body.className = 'body';
    body.textContent = text; // nikdy innerHTML – obsah je od ostatních uživatelů
    li.append(meta, body);
    append(li);
  }

  showLobby();
})();
