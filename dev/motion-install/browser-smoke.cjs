const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Motion installation check</title>
<style>.answer { padding: 4px 2px 20px; } .cards { display: flex; gap: 10px; margin-top: 1000px; } .cards > div { width: 60px; height: 60px; background: teal; } #box { width: 20px; height: 20px; background: coral; }</style>
<script src="/motion.js" defer></script><script src="/consumer.js" defer></script></head><body>
<div id="box"></div><div data-motion-dev="faq"><details><summary>Question</summary><div class="answer">Answer text for the existing accordion controller.</div></details></div>
<div class="cards" data-motion-dev="cards"><div></div><div></div><div></div></div></body></html>`;
const failures = [];
const results = [];

(async () => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    res.setHeader('Content-Type', url.pathname.endsWith('.js') ? 'text/javascript' : 'text/html');
    if (url.pathname === '/') return res.end(html);
    if (url.pathname === '/motion.js') {
      const filename = url.searchParams.get('version') === 'old' ? 'motion-13.4.6-before.js' : 'package/dist/motion.js';
      return fs.createReadStream(path.join(__dirname, filename)).pipe(res);
    }
    if (url.pathname === '/consumer.js') return fs.createReadStream(path.join(__dirname, '../../casify-theme/assets/cv-motion-dev.js')).pipe(res);
    res.statusCode = 404; res.end('Not found');
  });
  await new Promise(resolve => server.listen(4180, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    for (const version of ['old', 'new']) {
      const page = await browser.newPage();
      page.on('pageerror', error => failures.push({ version, error: error.message }));
      await page.route('**/motion.js', route => route.continue({ url: 'http://127.0.0.1:4180/motion.js?version=' + version }));
      await page.goto('http://127.0.0.1:4180/', { waitUntil: 'load' });
      const api = await page.evaluate(async () => {
        const names = ['animate', 'scroll', 'inView', 'hover', 'stagger', 'spring'];
        if (!names.every(name => typeof Motion[name] === 'function')) throw new Error('Missing public API');
        const controls = Motion.animate(document.getElementById('box'), { x: 40, opacity: 0.5 }, { duration: 0.1 });
        const completion = { then: typeof controls.then, finishedThen: typeof controls.finished?.then, stop: typeof controls.stop };
        await controls;
        const style = getComputedStyle(document.getElementById('box'));
        return { completion, x: new DOMMatrix(style.transform).m41, opacity: Number(style.opacity) };
      });
      assert.equal(api.x, 40); assert.equal(api.opacity, 0.5);
      assert.equal(api.completion.finishedThen, 'function');
      const summary = page.locator('summary');
      await summary.click();
      await page.waitForFunction(() => document.querySelector('details').open && document.querySelector('.answer').style.height === '');
      await summary.click();
      await page.waitForFunction(() => !document.querySelector('details').open && document.querySelector('.answer').style.height === '');
      await summary.press('Enter');
      await page.waitForFunction(() => document.querySelector('details').open && document.querySelector('.answer').style.height === '');
      await page.locator('.cards').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelector('.cards').children].every(card => Number(getComputedStyle(card).opacity) === 1));
      await page.locator('.cards > div').first().hover();
      await page.waitForFunction(() => new DOMMatrix(getComputedStyle(document.querySelector('.cards > div')).transform).m42 < -5);
      await summary.hover();
      await page.waitForFunction(() => Math.abs(new DOMMatrix(getComputedStyle(document.querySelector('.cards > div')).transform).m42) < 0.05);
      results.push({ version, api, faq: 'click/keyboard open and close with cleanup', cards: 'reveal and hover working' });
      await page.close();
    }
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:4180/', { waitUntil: 'load' });
    await page.locator('summary').click();
    assert.equal(await page.locator('details').evaluate(item => item.open), true);
    assert.equal(await page.locator('.answer').evaluate(body => body.style.height), '');
    results.push({ version: 'new', reducedMotion: 'native details working, no hidden cards' });
    await page.close();
    assert.deepEqual(failures, []);
    fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify({ passed: true, results }, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ passed: true, results }, null, 2) + '\n');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
