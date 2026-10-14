const { chromium } = require('C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const output = path.resolve(__dirname, '../.impeccable/review/hero-storyboard');
const url = 'http://127.0.0.1:4173/dev/casify-hero-preview.html';
const errors = [];
const report = [];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [name, width, height] of [
      ['desktop', 1440, 900], ['tablet', 1024, 768],
      ['mobile', 390, 844], ['small-mobile', 320, 740], ['landscape', 844, 390]
    ]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.locator('[data-csh-ready="true"]').waitFor();
      await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        heading: document.querySelector('h1').textContent,
        cta: document.querySelector('[data-csh-cta]').getAttribute('href'),
        images: [...document.querySelectorAll('.csh__product-image')].map(i => ({ loaded: i.complete && i.naturalWidth > 0, src: i.currentSrc })),
        stageHeight: document.querySelector('[data-csh-stage]').getBoundingClientRect().height
      }));
      assert.equal(state.overflow, false, `${name}: horizontal overflow`);
      assert(state.images.every(i => i.loaded), `${name}: product image failed to load`);
      report.push({ name, ...state });
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    const root = page.locator('[data-casify-story-hero]');
    await page.locator('[data-csh-replay]').click();
    await page.locator('[data-csh-pause]').click();
    assert.equal(await page.locator('[data-csh-pause]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-csh-pause-label]').textContent(), 'Resume');
    await page.locator('[data-csh-pause]').click();
    await page.locator('[data-csh-skip]').click();
    assert(await page.locator('[data-csh-pause]').isDisabled());
    await page.screenshot({ path: path.join(output, 'desktop-motion-controls.png'), fullPage: true });
    await page.route('**/f1dee6e4-9afa-448b-b104-077a642e24d5.jpg*', async route => {
      await new Promise(resolve => setTimeout(resolve, 150));
      await route.continue();
    });
    await page.locator('[data-csh-color="Silver"]').click();
    await page.locator('[data-csh-color="Black"]').click();
    await page.waitForTimeout(400);
    assert.match(await page.locator('.csh__device.is-front img').getAttribute('src'), /acb70b3f/);
    await page.locator('[data-csh-model]').nth(1).click();
    await page.locator('[data-csh-color="Silver"]').click();
    assert.equal(await root.getAttribute('data-selected-model'), 'iPhone 18 Pro Max 17 Pro Max');
    assert.equal(await root.getAttribute('data-selected-color'), 'Silver');
    assert.match(await page.locator('[data-csh-cta]').getAttribute('href'), /48739160129781/);
    await page.locator('[data-csh-replay]').click();
    await page.locator('[data-csh-color="Black"]').focus();
    assert(await page.locator('[data-csh-pause]').isDisabled(), 'Shopping focus must cancel intro');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert(await page.locator('[data-csh-motion-controls]').isHidden());
    report.push({ interactions: 'variant links, selection, replay/pause/resume/skip, shopping interruption, reduced motion: pass' });
    await page.close();
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(url, { waitUntil: 'networkidle' });
    assert(await mobile.locator('[data-csh-pause]').isDisabled(), 'Mobile starts static');
    await mobile.locator('[data-csh-replay]').click();
    await mobile.waitForTimeout(1150);
    assert(await mobile.locator('[data-csh-pause]').isDisabled(), 'Mobile reveal stops in 1.05 seconds');
    await mobile.screenshot({ path: path.join(output, 'mobile-motion-controls.png'), fullPage: true });
    await mobile.close();
    const nojs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await nojs.goto(url, { waitUntil: 'networkidle' });
    assert(await nojs.locator('[data-csh-cta]').isVisible());
    assert(await nojs.locator('[data-csh-motion-controls]').isHidden());
    report.push({ noJavaScript: 'Shopping link and product poster visible; inactive controls hidden: pass' });
    await nojs.close();
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'test-results.json'), JSON.stringify({ report, errors }, null, 2));
    console.log(JSON.stringify({ report, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
