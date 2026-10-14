const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    const loaded = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
    page.on('response', response => {
      if (response.url().includes('/assets/anime.')) loaded.push({ url: response.url(), status: response.status() });
    });
    await page.goto('http://127.0.0.1:4178', { waitUntil: 'load' });
    await page.locator('#classic-result').filter({ hasText: 'PASS' }).waitFor({ timeout: 10000 });
    await page.locator('#module-result').filter({ hasText: 'PASS' }).waitFor({ timeout: 10000 });
    const results = {
      browser: 'Headless Microsoft Edge (Chromium)',
      classic: await page.locator('#classic-result').innerText(),
      module: await page.locator('#module-result').innerText(),
      errors,
      loaded,
    };
    fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify(results, null, 2) + '\n');
    process.stdout.write(JSON.stringify(results, null, 2) + '\n');
    if (errors.length || loaded.length !== 2 || loaded.some(item => item.status !== 200)) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
