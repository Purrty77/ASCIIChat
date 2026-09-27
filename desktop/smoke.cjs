const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const assert = require('node:assert/strict');

const timeout = setTimeout(() => { console.error('Desktop smoke test timed out'); app.exit(1); }, 20000);
app.whenReady().then(async () => {
  try {
    const window = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
    await window.loadFile(path.join(__dirname, '..', 'index.html'));
    const result = await window.webContents.executeJavaScript(`(async () => {
      document.getElementById('demo').click();
      await new Promise((resolve, reject) => {
        let tries = 0;
        const timer = setInterval(() => {
          if (document.getElementById('art').textContent) { clearInterval(timer); resolve(); }
          else if (++tries > 100) { clearInterval(timer); reject(new Error('Demo failed')); }
        }, 50);
      });
      const normal = document.getElementById('art').textContent;
      document.getElementById('twitch').click();
      const twitch = document.getElementById('art').textContent;
      document.getElementById('twitch-width').value = 30;
      document.getElementById('twitch-reset').click();
      return { normal: normal.length, twitch: twitch.length, enabled: !document.getElementById('copy').disabled,
        width: document.getElementById('twitch-width').value, nodeExposed: typeof require !== 'undefined' };
    })()`);
    assert.ok(result.normal > 0);
    assert.ok(result.twitch > 0 && result.twitch <= 500);
    assert.equal(result.enabled, true);
    assert.equal(result.width, '20');
    assert.equal(result.nodeExposed, false);
    console.log('Desktop smoke passed: local modules, image conversion, Twitch, reset, renderer isolation.');
    clearTimeout(timeout);
    app.exit(0);
  } catch (error) { console.error(error); clearTimeout(timeout); app.exit(1); }
});
