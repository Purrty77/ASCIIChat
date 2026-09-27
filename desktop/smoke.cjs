const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const assert = require('node:assert/strict');

const timeout = setTimeout(() => { console.error('Desktop smoke test timed out'); app.exit(1); }, 20000);
app.whenReady().then(async () => {
  try {
    const window = new BrowserWindow({ show: false, width: 1366, height: 768, useContentSize: true, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
    await window.loadFile(path.join(__dirname, '..', 'index.html'));
    const result = await window.webContents.executeJavaScript(`(async () => {
      const logo = document.querySelector('.logo img');
      await logo.decode();
      const logoLoaded = logo.naturalWidth > 0;
      const initialFits = document.documentElement.scrollHeight <= innerHeight;
      const github = document.querySelector('.github-link').href;
      document.getElementById('demo').click();
      await new Promise((resolve, reject) => {
        let tries = 0;
        const timer = setInterval(() => {
          if (document.getElementById('art').textContent) { clearInterval(timer); resolve(); }
          else if (++tries > 100) { clearInterval(timer); reject(new Error('Demo failed')); }
        }, 50);
      });
      const twitch = document.getElementById('art').textContent;
      const defaultTwitch = !document.getElementById('twitch').checked && !document.getElementById('twitch-settings').hidden;
      document.getElementById('twitch').click();
      const normal = document.getElementById('art').textContent;
      const classicVisible = !document.getElementById('classic-settings').hidden && document.getElementById('twitch-settings').hidden;
      document.getElementById('twitch').click();
      document.getElementById('twitch-width').value = 30;
      document.getElementById('twitch-reset').click();
      return { initialFits, github, logoLoaded, defaultTwitch, classicVisible, normal: normal.length, twitch: twitch.length, enabled: !document.getElementById('copy').disabled,
        width: document.getElementById('twitch-width').value, nodeExposed: typeof require !== 'undefined' };
    })()`);
    assert.ok(result.normal > 0);
    assert.equal(result.logoLoaded, true);
    assert.equal(result.initialFits, true, 'Initial desktop layout must fit without page scrolling');
    assert.equal(result.github, 'https://github.com/Purrty77/ASCIIChat');
    assert.equal(result.defaultTwitch, true);
    assert.equal(result.classicVisible, true);
    assert.ok(result.twitch > 0 && result.twitch <= 500);
    assert.equal(result.enabled, true);
    assert.equal(result.width, '20');
    assert.equal(result.nodeExposed, false);
    console.log('Desktop smoke passed: local modules, image conversion, Twitch, reset, renderer isolation.');
    clearTimeout(timeout);
    app.exit(0);
  } catch (error) { console.error(error); clearTimeout(timeout); app.exit(1); }
});
