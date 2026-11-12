'use strict';
// Relay server: přeposílá neprůhledné (šifrované) binární rámce mezi klienty
// ve stejné místnosti. Nezná klíče, přezdívky ani obsah a nic neukládá.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_FRAME_BYTES = 64 * 1024;
const MAX_ROOM_SIZE = 50;
const RATE_BURST = 20; // zpráv
const RATE_REFILL_MS = 500; // 1 zpráva za 500 ms
const HEARTBEAT_MS = 30000;
const ROOM_ID_RE = /^[0-9a-f]{32}$/;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  const file = path.join(PUBLIC_DIR, pathname);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Nenalezeno');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy':
        "default-src 'self'; connect-src 'self' ws: wss:; base-uri 'none'; form-action 'none'",
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

function createServer() {
  const server = http.createServer(serveStatic);
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES });
  /** @type {Map<string, Set<import('ws').WebSocket>>} */
  const rooms = new Map();

  const control = (ws, obj) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
  };

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    const roomId = url.searchParams.get('room') || '';
    if (url.pathname !== '/ws' || !ROOM_ID_RE.test(roomId)) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    const room = rooms.get(roomId);
    if (room && room.size >= MAX_ROOM_SIZE) {
      socket.end('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => join(ws, roomId));
  });

  function join(ws, roomId) {
    let room = rooms.get(roomId);
    if (!room) rooms.set(roomId, (room = new Set()));
    ws.id = crypto.randomBytes(8).toString('hex'); // náhodné ID spojení, ne identita
    ws.isAlive = true;
    ws.tokens = RATE_BURST;
    ws.lastRefill = Date.now();
    room.add(ws);

    control(ws, { t: 'welcome', id: ws.id, n: room.size });
    for (const peer of room) if (peer !== ws) control(peer, { t: 'join', id: ws.id, n: room.size });

    ws.on('pong', () => (ws.isAlive = true));

    ws.on('message', (data, isBinary) => {
      if (!isBinary) return; // klienti posílají jen šifrovaná binární data
      const now = Date.now();
      ws.tokens = Math.min(RATE_BURST, ws.tokens + (now - ws.lastRefill) / RATE_REFILL_MS);
      ws.lastRefill = now;
      if (ws.tokens < 1) {
        control(ws, { t: 'error', code: 'rate' });
        return;
      }
      ws.tokens -= 1;
      for (const peer of room) {
        if (peer !== ws && peer.readyState === peer.OPEN) peer.send(data, { binary: true });
      }
    });

    ws.on('close', () => {
      room.delete(ws);
      if (room.size === 0) rooms.delete(roomId);
      else for (const peer of room) control(peer, { t: 'leave', id: ws.id, n: room.size });
    });
    ws.on('error', () => ws.terminate());
  }

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();
  server.on('close', () => {
    clearInterval(heartbeat);
    for (const ws of wss.clients) ws.terminate();
  });

  return server;
}

module.exports = { createServer, MAX_FRAME_BYTES, MAX_ROOM_SIZE };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  createServer().listen(port, host, () => {
    console.log(`relay-chat běží na http://${host}:${port}`);
  });
}
