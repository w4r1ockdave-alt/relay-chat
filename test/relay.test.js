'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { once } = require('node:events');
const WebSocket = require('ws');
const { createServer } = require('../server');
const RelayCrypto = require('../public/crypto.js');

async function start() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, base: `127.0.0.1:${server.address().port}` };
}

// Fronta zpráv, aby se žádná neztratila mezi jednotlivými await.
function client(url) {
  const ws = new WebSocket(url);
  const queue = [];
  const waiters = [];
  ws.on('message', (data, isBinary) => {
    const m = { data, isBinary };
    if (waiters.length) waiters.shift()(m);
    else queue.push(m);
  });
  ws.next = () => (queue.length ? Promise.resolve(queue.shift()) : new Promise((r) => waiters.push(r)));
  ws.nextControl = async () => JSON.parse((await ws.next()).data.toString());
  return ws;
}

test('přeposílá šifrované rámce jen v rámci místnosti a beze změny', async () => {
  const { server, base } = await start();
  const secret = RelayCrypto.newSecret();
  const room = await RelayCrypto.deriveRoom(secret);
  const other = await RelayCrypto.deriveRoom(RelayCrypto.newSecret());
  assert.notStrictEqual(room.roomId, other.roomId);
  assert.ok(!secret.includes(room.roomId));

  const a = client(`ws://${base}/ws?room=${room.roomId}`);
  assert.strictEqual((await a.nextControl()).t, 'welcome');
  const b = client(`ws://${base}/ws?room=${room.roomId}`);
  const welcomeB = await b.nextControl();
  assert.deepStrictEqual([welcomeB.t, welcomeB.n], ['welcome', 2]);
  assert.strictEqual((await a.nextControl()).t, 'join');
  const c = client(`ws://${base}/ws?room=${other.roomId}`);
  assert.strictEqual((await c.nextControl()).n, 1);

  const frame = await RelayCrypto.seal(room, { type: 'msg', text: 'tajné', nick: 'A' });
  assert.ok(!Buffer.from(frame).includes('tajné'));
  a.send(frame);
  const got = await b.next();
  assert.ok(got.isBinary);
  assert.deepStrictEqual(new Uint8Array(got.data), frame);
  assert.strictEqual((await RelayCrypto.open(room, got.data)).text, 'tajné');
  assert.strictEqual(await RelayCrypto.open(other, got.data), null);

  // textové rámce od klientů server ignoruje; odchod se oznámí ostatním
  a.send('nešifrovaný text');
  a.close();
  const leave = await b.nextControl();
  assert.deepStrictEqual([leave.t, leave.n], ['leave', 1]);

  b.close();
  c.close();
  server.close();
});

test('pozměněný rámec se nepodaří dešifrovat', async () => {
  const room = await RelayCrypto.deriveRoom(RelayCrypto.newSecret());
  const frame = await RelayCrypto.seal(room, { text: 'x' });
  frame[frame.length - 1] ^= 1;
  assert.strictEqual(await RelayCrypto.open(room, frame), null);
});

test('odmítne neplatné ID místnosti a omezí rychlost', async () => {
  const { server, base } = await start();
  const bad = new WebSocket(`ws://${base}/ws?room=nope`);
  const [err] = await once(bad, 'error');
  assert.match(err.message, /400/);

  const id = 'ab'.repeat(16);
  const a = client(`ws://${base}/ws?room=${id}`);
  await a.nextControl();
  for (let i = 0; i < 40; i++) a.send(Buffer.from([1, 2, 3]));
  const c = await a.nextControl();
  assert.deepStrictEqual(c, { t: 'error', code: 'rate' });
  a.close();
  server.close();
});
