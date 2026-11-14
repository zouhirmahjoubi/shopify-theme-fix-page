const { chromium } = require('C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:8774/preview.html';
  const out = path.join(__dirname, '.impeccable', 'review');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-crs-play]').click();
  await page.mouse.move(0, 0);
  const initial = await page.locator('[data-crs-current]').textContent();
  assert.equal(initial, '01');
  assert.equal(await page.locator('[data-crs-play]').getAttribute('aria-pressed'), 'false');
  await page.screenshot({ path: path.join(out, 'desktop.png'), fullPage: true });
  const states = [];
  for (let index = 0; index < 4; index++) {
    await page.locator(`[data-crs-pick="${index}"]`).click();
    await page.waitForTimeout(850);
    assert.equal(await page.locator('[data-crs-current]').textContent(), String(index + 1).padStart(2, '0'));
    assert.equal(await page.locator('[data-crs-slide]:not([hidden])').count(), 1);
    assert.equal(await page.locator('[data-crs-pick][aria-pressed="true"]').count(), 1);
    const slide = page.locator('[data-crs-slide]:not([hidden])');
    assert.equal(await page.locator('[data-crs-link]').getAttribute('href'), await slide.getAttribute('data-url'));
    const image = await slide.locator('img').evaluate(img => ({ loaded: img.complete && img.naturalWidth > 0 }));
    assert.ok(image.loaded);
    states.push(await slide.getAttribute('data-name'));
  }
  await page.locator('[data-crs-pick="3"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-crs-current]').textContent(), '01');
  await page.keyboard.press('End');
  assert.equal(await page.locator('[data-crs-current]').textContent(), '04');
  await page.keyboard.press('Home');
  assert.equal(await page.locator('[data-crs-current]').textContent(), '01');
  await page.locator('[data-crs-prev]').click();
  assert.equal(await page.locator('[data-crs-current]').textContent(), '04');
  // Rapid interactions must cancel outgoing animations without leaving stale slides.
  await page.evaluate(() => {
    const next = document.querySelector('[data-crs-next]');
    for (let i = 0; i < 13; i++) next.click();
  });
  await page.waitForTimeout(900);
  assert.equal(await page.locator('[data-crs-slide]:not([hidden])').count(), 1);
  // A live motion preference change must settle an in-progress transition.
  await page.locator('[data-crs-next]').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('[data-crs-slide]:not([hidden])').count(), 1);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Explicit Play resumes while the activated control retains keyboard focus.
  await page.locator('[data-crs-play]').focus();
  const beforePlayback = await page.locator('[data-crs-current]').textContent();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(6400);
  assert.notEqual(await page.locator('[data-crs-current]').textContent(), beforePlayback);
  await page.keyboard.press('Enter');
  const lifecycle = await page.evaluate(() => {
    const el = document.querySelector('casify-reel-showcase');
    const parent = el.parentNode, next = el.nextSibling;
    const previous = el._index;
    el.remove();
    const cleaned = !el._abort;
    parent.insertBefore(el, next);
    el.querySelector('[data-crs-next]').click();
    return { cleaned, newIndex: el._index, count: el.querySelectorAll('[data-crs-art] svg').length, previous };
  });
  assert.ok(lifecycle.cleaned);
  assert.equal(lifecycle.newIndex, 1);
  assert.equal(lifecycle.count, 1);
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(url, { waitUntil: 'networkidle' });
  await mobile.evaluate(() => document.fonts.ready);
  assert.equal(await mobile.locator('[data-crs-play]').getAttribute('aria-pressed'), 'false');
  await mobile.screenshot({ path: path.join(out, 'mobile.png'), fullPage: true });
  await mobile.locator('[data-crs-next]').click();
  assert.equal(await mobile.locator('[data-crs-current]').textContent(), '02');
  assert.equal(await mobile.locator('[data-crs-slide]:not([hidden])').count(), 1);
  const overflow = await Promise.all([page, mobile].map(p => p.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }))));
  overflow.forEach(o => assert.ok(o.scroll <= o.width, JSON.stringify(o)));
  assert.deepEqual(errors, []);
  const results = { status: 'passed', states, lifecycle, overflow, errors, checks: ['four real product images', 'synchronized palette/art/title/link', 'button and keyboard navigation', 'wraparound', 'rapid transition cancellation', 'custom element cleanup and reconnect', 'mobile reduced motion', 'no horizontal overflow', 'no browser errors'] };
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
