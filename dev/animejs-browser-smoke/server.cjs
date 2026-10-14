const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const themeRoot = path.resolve(__dirname, '../../casify-theme');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Anime.js browser verification</title>
<script>window.smokeErrors = []; window.addEventListener('error', e => window.smokeErrors.push(e.message)); window.addEventListener('unhandledrejection', e => window.smokeErrors.push(String(e.reason)));</script>
<script src="/assets/anime.umd.min.js" defer></script>
<script src="/classic.js" defer></script>
<script type="module" src="/module.js"></script>
</head><body><h1>Anime.js browser verification</h1>
<p id="classic-result">UMD: waiting</p><div id="classic-box" style="width:30px;height:30px;background:teal"></div>
<p id="module-result">ESM: waiting</p><div id="module-box" style="width:30px;height:30px;background:coral"></div>
<p id="errors">Errors: waiting</p></body></html>`;

function consumer(format, expression) {
  return `${expression}
const result = document.getElementById('${format}-result');
const box = document.getElementById('${format}-box');
try {
  const names = ['animate', 'createTimeline', 'stagger', 'onScroll', 'splitText'];
  if (!names.every(name => typeof api[name] === 'function')) throw new Error('Missing API');
  if (format === 'classic' && !window.AnimeJS.some(item => item.version === '4.5.0')) throw new Error('Version mismatch');
  api.animate(box, { x: [0, 100], opacity: [1, 0.5], duration: 300, ease: 'linear', onComplete() {
    const x = new DOMMatrix(getComputedStyle(box).transform).m41;
    const opacity = Number(getComputedStyle(box).opacity);
    const passed = Math.abs(x - 100) < 0.01 && Math.abs(opacity - 0.5) < 0.01;
    result.textContent = '${format === 'classic' ? 'UMD' : 'ESM'}: ' + (passed ? 'PASS' : 'FAIL') + ' — API available; animated DOM to x=' + x + ', opacity=' + opacity;
    document.getElementById('errors').textContent = 'Errors: ' + (window.smokeErrors.length ? window.smokeErrors.join('; ') : 'none');
  }});
} catch (error) { result.textContent = '${format}: FAIL — ' + error.message; }
`.replace("if (format === 'classic'", `if ('${format}' === 'classic'`);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html'); return res.end(html); }
  if (url.pathname === '/classic.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(consumer('classic', 'const api = window.anime;')); }
  if (url.pathname === '/module.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(consumer('module', "import * as api from './assets/anime.esm.min.js';")); }
  if (['/assets/anime.umd.min.js', '/assets/anime.esm.min.js'].includes(url.pathname)) {
    res.setHeader('Content-Type', 'text/javascript');
    return fs.createReadStream(path.join(themeRoot, url.pathname.slice(1))).pipe(res);
  }
  res.statusCode = 404; res.end('Not found');
});
server.listen(4178, '127.0.0.1', () => process.stdout.write('Anime.js smoke server: http://127.0.0.1:4178\n'));
process.on('SIGINT', () => server.close(() => process.exit(0)));
