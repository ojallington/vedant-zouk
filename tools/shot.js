// Minimal Chrome DevTools Protocol driver (no dependencies): launches headless Chrome, loads the page,
// collects console/exception messages, takes screenshots, sends key/touch input. Usage:
//   node test/cdp.js <url> <out.png> [width height] [script]   (script: a small JSON list of steps)
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
async function main() {
  const url = process.argv[2]; const out = process.argv[3] || '/tmp/shot.png'; const W = +(process.argv[4] || 1280), H = +(process.argv[5] || 800);
  const steps = process.argv[6] ? JSON.parse(fs.readFileSync(process.argv[6], 'utf8')) : [];
  const port = 9300 + Math.floor(Math.random() * 500);
  const bin = fs.existsSync('/usr/bin/google-chrome-stable') ? '/usr/bin/google-chrome-stable' : '/usr/bin/chromium';
  const chrome = spawn(bin, ['--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', `--window-size=${W},${H}`, `--remote-debugging-port=${port}`, '--user-data-dir=/tmp/claude-1000/cdp-profile-' + port, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = ''; chrome.stderr.on('data', d => { stderr += d; });
  const getJSON = (p) => new Promise((res, rej) => http.get(`http://127.0.0.1:${port}${p}`, r => { let s = ''; r.on('data', d => s += d); r.on('end', () => { try { res(JSON.parse(s)); } catch (e) { rej(e); } }); }).on('error', rej));
  let targets = null; for (let i = 0; i < 50 && !targets; i++) { await new Promise(r => setTimeout(r, 200)); try { targets = await getJSON('/json/list'); } catch (e) { } }
  if (!targets) { console.log('chrome did not start', stderr.slice(-500)); chrome.kill(); process.exit(2); }
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const waiting = new Map(); const logs = []; const errors = [];
  ws.onmessage = (m) => { const j = JSON.parse(m.data); if (j.id && waiting.has(j.id)) { waiting.get(j.id)(j); waiting.delete(j.id); } else if (j.method === 'Runtime.consoleAPICalled') { const txt = j.params.args.map(a => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' '); logs.push(j.params.type + ': ' + txt); if (j.params.type === 'error') errors.push(txt); } else if (j.method === 'Runtime.exceptionThrown') { const d = j.params.exceptionDetails; errors.push('EXCEPTION: ' + (d.exception && d.exception.description || d.text) + ' @' + d.lineNumber); } else if (j.method === 'Log.entryAdded') { const e = j.params.entry; if (e.level === 'error') errors.push('LOG: ' + e.text); } };
  const send = (method, params) => new Promise(res => { const my = ++id; waiting.set(my, res); ws.send(JSON.stringify({ id: my, method, params: params || {} })); });
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < H });
  if (W < H) await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await send('Page.navigate', { url });
  await new Promise(r => setTimeout(r, 1500));
  const results = [];
  for (const st of steps) {
    if (st.wait) await new Promise(r => setTimeout(r, st.wait * 1000));
    if (st.key) { for (const k of [].concat(st.key)) { const def = { key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: k === 'Enter' ? 13 : k === ' ' ? 32 : k === 'ArrowLeft' ? 37 : k === 'ArrowRight' ? 39 : k === 'ArrowUp' ? 38 : k === 'ArrowDown' ? 40 : k === 'Escape' ? 27 : k.toUpperCase().charCodeAt(0) }; await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, def)); if (st.hold) await new Promise(r => setTimeout(r, st.hold * 1000)); else await new Promise(r => setTimeout(r, 40)); await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, def)); } }
    if (st.tap) { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: st.tap[0], y: st.tap[1] }] }); await new Promise(r => setTimeout(r, (st.hold || 0.06) * 1000)); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    if (st.click) { await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: st.click[0], y: st.click[1], button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: st.click[0], y: st.click[1], button: 'left', clickCount: 1 }); }
    if (st.eval) { const r = await send('Runtime.evaluate', { expression: st.eval, returnByValue: true, awaitPromise: true }); results.push({ eval: st.eval.slice(0, 60), value: r.result && r.result.result ? r.result.result.value : (r.result && r.result.exceptionDetails ? 'EXC ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300) : null) }); }
    if (st.shot) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(st.shot, Buffer.from(r.result.data, 'base64')); }
  }
  const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(out, Buffer.from(r.result.data, 'base64'));
  const fps = await send('Runtime.evaluate', { expression: 'JSON.stringify({title: document.title, h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, overflowX: document.documentElement.scrollWidth > window.innerWidth})', returnByValue: true });
  console.log(JSON.stringify({ errors, logs: logs.slice(0, 40), results, status: fps.result && fps.result.result && fps.result.result.value }, null, 1));
  ws.close(); chrome.kill();
}
main().catch(e => { console.log('driver error', e); process.exit(3); });
