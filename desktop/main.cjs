const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

function createWindow() {
  const window = new BrowserWindow({
    title: 'ASCIIChat',
    icon: path.join(__dirname, '..', 'assets', 'branding', 'asciichat.ico'),
    width: 1200,
    height: 900,
    minWidth: 600,
    minHeight: 600,
    backgroundColor: '#0e0e10',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'https://github.com/Purrty77/ASCIIChat') shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
