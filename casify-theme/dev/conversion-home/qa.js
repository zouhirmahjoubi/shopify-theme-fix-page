// Preview-only reporting: these measurements come from the browser viewing this page.
(() => {
  const errors = [];
  const failedResources = [];
  const record = (list, item) => { if (list.length < 20) list.push(item); };
  window.addEventListener('error', event => {
    if (event.target !== window) {
      record(failedResources, { tag: event.target.tagName, url: event.target.currentSrc || event.target.src || event.target.href || '' });
    } else {
      record(errors, { message: event.message, file: event.filename, line: event.lineno, column: event.colno });
    }
  }, true);
  window.addEventListener('unhandledrejection', event => record(errors, { message: String(event.reason?.message || event.reason), type: 'unhandledrejection' }));
  let timer;
  function report() {
    const width = document.documentElement.clientWidth;
    const pageWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
    const candidates = [...document.querySelectorAll('body *')].filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.left < -1 || rect.right > width + 1);
    }).slice(0, 12).map(element => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName, id: element.id, class: String(element.className?.baseVal || element.className || '').slice(0, 120), left: Math.round(rect.left), right: Math.round(rect.right) };
    });
    const brokenImages = [...document.images].filter(image => image.complete && image.currentSrc && image.naturalWidth === 0).slice(0, 12).map(image => image.currentSrc);
    const scriptSources = [...document.scripts].map(script => script.src).filter(Boolean);
    const duplicateScripts = scriptSources.filter((source, index) => scriptSources.indexOf(source) !== index);
    const payload = {
      page: location.pathname + location.search,
      sampledAt: new Date().toISOString(),
      viewport: { width, height: innerHeight, devicePixelRatio },
      readyState: document.readyState,
      pageWidth, pageOverflow: pageWidth > width + 1,
      overflowCandidates: candidates,
      errors, failedResources, brokenImages, duplicateScripts,
      productCards: document.querySelectorAll('[data-home-card]').length,
      visibleProductCards: [...document.querySelectorAll('[data-home-card]')].filter(card => !card.hidden).length,
      dialogOpen: Boolean(document.querySelector('[data-home-dialog]')?.open),
      scripts: scriptSources,
      gsap: typeof window.gsap,
      scrollTrigger: typeof window.ScrollTrigger,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
    };
    fetch('/qa/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(report, 700); }
  window.addEventListener('load', () => { schedule(); setTimeout(report, 2500); });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('click', schedule);
  document.addEventListener('change', schedule);
  document.addEventListener('toggle', schedule, true);
  window.previewReport = report;
})();
