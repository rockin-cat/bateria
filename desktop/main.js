// ROCKIN · Bateria com a programa d'escriptori (Windows).
// Serveix els fitxers del joc amb un protocol propi (app://bateria/) perquè els mòduls, el MIDI i
// el desat (localStorage) funcionin igual que a la web.
const { app, BrowserWindow, protocol, net, session, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1366, height: 820, minWidth: 1024, minHeight: 640,
    backgroundColor: '#0d1320', autoHideMenuBar: true, title: 'ROCKIN · Bateria',
    icon: path.join(__dirname, 'app', 'assets', 'brand', 'favicon.png'),
    webPreferences: { contextIsolation: true },
  });
  win.loadURL('app://bateria/index.html');
  // Els enllaços externs s'obren al navegador
  win.webContents.setWindowOpenHandler(({ url }) => { if (!url.startsWith('app://')) shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(() => {
  const root = path.join(__dirname, 'app');
  protocol.handle('app', (req) => {
    const u = new URL(req.url);
    let p = decodeURIComponent(u.pathname);
    if (p === '/' || p === '') p = '/index.html';
    const file = path.normalize(path.join(root, p));
    if (!file.startsWith(root)) return new Response('No', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  // La bateria electrònica (Web MIDI) i el so sense haver de clicar
  const allow = new Set(['midi', 'midiSysex', 'media']);
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(allow.has(perm)));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => allow.has(perm));
  createWindow();
});
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.on('window-all-closed', () => app.quit());
