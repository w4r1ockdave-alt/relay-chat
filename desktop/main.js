import { app, BrowserWindow, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

// A fixed loopback origin preserves browser storage across launches. Fail closed if
// another process already owns the port rather than connecting to that process.
const port = 31477;
const origin = `http://127.0.0.1:${port}`;
let server;
let window;

async function launch() {
  const dataDir = app.getPath('userData');
  fs.mkdirSync(dataDir, { recursive: true });
  process.env.RELAY_DESKTOP = '1';
  process.env.RELAY_DB_PATH = path.join(dataDir, 'db.json');
  const secretPath = path.join(dataDir, 'jwt-secret');
  if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  process.env.JWT_SECRET = fs.readFileSync(secretPath, 'utf8');
  // Only seed a new installation, so deleting demo content stays deleted.
  if (!fs.existsSync(process.env.RELAY_DB_PATH)) await import('../server/seed.js');
  const { app: api } = await import('../server/index.js');
  server = await new Promise((resolve, reject) => {
    const listener = api.listen(port, '127.0.0.1', () => resolve(listener));
    listener.once('error', reject);
  });
  window = new BrowserWindow({
    width: 1440, height: 920, minWidth: 760, minHeight: 600,
    backgroundColor: '#0a0a0f', title: 'Relay', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== origin) event.preventDefault();
  });
  await window.loadURL(origin);
}

const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(launch).catch(error => {
    dialog.showErrorBox('Relay se nepodařilo spustit', `Zkontrolujte, zda není obsazen místní port ${port}.\n\n${error.message}`);
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { if (server) server.close(); });
}
