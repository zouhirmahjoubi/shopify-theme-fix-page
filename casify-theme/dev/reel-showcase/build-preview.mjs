import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const themeRoot = resolve(here, '../..');
const workspaceRoot = resolve(themeRoot, '..');
const deliveryRoot = join(workspaceRoot, 'deliverables/casify-reel-showcase-2026-10-15');
const store = 'https://casiffy.myshopify.com';
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
const left = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>';
const pause = '<svg data-crs-pause-icon viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3v14H7zm7 0h3v14h-3z"/></svg>';
const play = '<svg data-crs-play-icon viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" hidden><path d="m8 4 12 8-12 8z"/></svg>';
const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
const designs = [
  {
    name: 'Silver', title: 'The Space Case',
    copy: 'A silver finish, a magnetic mount and a built-in kickstand. Meet the Two-in-One Space Case.',
    description: 'Silver finish. Magnetic mount & kickstand.',
    productTitle: 'Two-in-One Space Case with Magnetic Mount & Kickstand for iPhone',
    handle: 'two-in-one-space-case-with-magnetic-mount-for-iphone-18-pro-max',
    photo: 'p1.jpg', width: 1600, height: 1600,
    background: '#DFE8D0', ink: '#273C2B', pattern: 'contour'
  },
  {
    name: 'Clear', title: 'Clearly yours',
    copy: 'A transparent magnetic case for iPhone. Let your phone take the spotlight.',
    description: 'Transparent design. Magnetic case for iPhone.',
    productTitle: 'Transparent Magnetic Phone Case for iPhone',
    handle: 'transparent-magnetic-phone-case-for-iphone',
    photo: 'p7.jpg', width: 1500, height: 1500,
    background: '#DCEBEA', ink: '#173F46', pattern: 'wave'
  },
  {
    name: 'Glitter', title: 'A little sparkle',
    copy: 'A glitter finish with a magnetic stand. A little shine for your everyday carry.',
    description: 'Glitter design. Four-corner airbag case with stand.',
    productTitle: 'Four-Corner Airbag Phone Case with Magnetic Stand and Glitter Design',
    handle: 'four-corner-airbag-phone-case-with-magnetic-stand-and-glitter-design',
    photo: 'p6.jpg', width: 800, height: 800,
    background: '#F0D8BF', ink: '#67351B', pattern: 'flame'
  },
  {
    name: 'Rose', title: 'A rosy outlook',
    copy: 'A clear look with rose-toned details. Explore the Apple phone case and choose your exact model.',
    description: 'Clear look. Rose-toned ring and camera details.',
    productTitle: 'Mobile phone case - Apple',
    handle: 'mobile-phone-case-apple',
    photo: 'p10.jpg', width: 800, height: 800,
    background: '#F0D8DE', ink: '#642F45', pattern: 'petal'
  }
];

for (const design of designs) {
  design.sourcePath = join(themeRoot, 'dev/og/photos', design.photo);
  design.url = `${store}/products/${design.handle}`;
  design.image = `data:image/jpeg;base64,${(await readFile(design.sourcePath)).toString('base64')}`;
}
const [css, js] = await Promise.all([
  readFile(join(themeRoot, 'assets/cv-reel-showcase.css'), 'utf8'),
  readFile(join(themeRoot, 'assets/cv-reel-showcase.js'), 'utf8')
]);
const first = designs[0];
const slides = designs.map((design, index) => `
        <div class="crs__slide${index === 0 ? ' is-active' : ''}" id="reel-slide-${index}" data-crs-slide
          data-name="${escape(design.name)}" data-title="${escape(design.title)}" data-copy="${escape(design.copy)}"
          data-url="${escape(design.url)}" data-cta="Explore this case" data-bg="${design.background}" data-ink="${design.ink}" data-accent="${design.ink}" data-pattern="${design.pattern}"
          role="group" aria-roledescription="slide" aria-label="${index + 1} of ${designs.length}"${index ? ' hidden' : ''}>
          <img class="crs__case-image" src="${design.image}" width="${design.width}" height="${design.height}" alt="${escape(design.productTitle)}" ${index ? 'loading="eager"' : 'fetchpriority="high"'}>
        </div>`).join('');
const picks = designs.map((design, index) => `
        <button class="crs__pick" type="button" data-crs-pick="${index}" aria-pressed="${index === 0}" aria-controls="reel-slide-${index}" aria-label="Show ${escape(design.name)} case" style="--pick-bg: ${design.background}">
          <span class="crs__pick-image"><img src="${design.image}" width="${design.width}" height="${design.height}" alt="" loading="lazy"></span>
          <span class="crs__pick-name">${escape(design.name)} ${check}</span>
          <span class="crs__pick-description">${escape(design.description)}</span>
        </button>`).join('');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#DFE8D0">
  <meta name="description" content="Find your kind of case. Explore four original Casify designs in a moving shop window.">
  <title>Casify — Find your kind of case</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Playfair+Display:ital,wght@0,700;0,800;1,800&display=swap" rel="stylesheet">
  <style>
    html { scroll-behavior: smooth; scroll-padding-top: 24px; }
    body { margin: 0; color: #33231a; background: #fdf9f1; font-family: "Libre Baskerville", Georgia, serif; }
    .preview-skip { position: absolute; left: 20px; top: -80px; z-index: 20; padding: 12px 18px; background: #33231a; color: #fff; }
    .preview-skip:focus { top: 12px; }
    .preview-header { min-height: 87px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 19px 4.4%; background: #fdf9f1; }
    .preview-logo { color: #a8231f; text-decoration: none; font: 800 37px/1 "Playfair Display", Georgia, serif; letter-spacing: -.055em; }
    .preview-nav { display: flex; gap: 35px; align-items: center; }
    .preview-nav a, .preview-bag { color: #33231a; text-decoration: none; font-size: 11px; }
    .preview-nav a:hover, .preview-bag:hover { text-decoration: underline; text-underline-offset: 5px; }
    .preview-bag { display: inline-flex; align-items: center; gap: 9px; }
    .preview-bag svg { width: 19px; height: 21px; }
    .preview-footer { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 35px 4.4%; background: #f7eddd; }
    .preview-footer p { margin: 0; font-size: 10px; line-height: 1.8; }
    .preview-footer .preview-logo { font-size: 29px; }
    .preview-footer a:focus-visible, .preview-header a:focus-visible { outline: 2px solid #a8231f; outline-offset: 6px; }
    @media(max-width: 600px) {
      .preview-header { min-height: 74px; padding: 17px 7%; gap: 14px; }
      .preview-logo { font-size: 32px; }
      .preview-nav { gap: 16px; }
      .preview-nav a { font-size: 9px; }
      .preview-bag span { display: none; }
      .preview-bag svg { width: 18px; height: 20px; }
      .preview-footer { padding: 30px 7%; gap: 18px; }
      .preview-footer p { max-width: 21ch; text-align: right; font-size: 9px; }
    }
    @media(prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
${css}
  </style>
</head>
<body id="top">
  <a class="preview-skip" href="#main">Skip to cases</a>
  <header class="preview-header">
    <a class="preview-logo" href="#top" aria-label="Casify home">Casify.</a>
    <nav class="preview-nav" aria-label="Main navigation"><a href="#cases">Shop cases</a><a href="#fit">Find your fit</a></nav>
    <a class="preview-bag" href="${store}/cart" aria-label="Open your bag in the Casify store"><svg viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 8h16l1 15H3L4 8Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></svg><span>Your bag</span></a>
  </header>
  <main id="main">
    <casify-reel-showcase class="crs" data-autoplay="true" style="--crs-bg: ${first.background}; --crs-ink: ${first.ink}; --crs-accent: ${first.ink}">
      <section class="crs__hero" aria-label="Casify design showcase" aria-roledescription="carousel">
        <div class="crs__art" data-crs-art data-pattern="contour" aria-hidden="true"></div>
        <div class="crs__word" data-crs-word aria-hidden="true">Silver</div>
        <div class="crs__stage">${slides}
        </div>
        <div class="crs__caption">
          <h1 class="crs__title" data-crs-title>${escape(first.title)}</h1>
          <p class="crs__copy" data-crs-copy>${escape(first.copy)}</p>
          <a class="crs__link" data-crs-link href="${first.url}"><span data-crs-link-label>Explore this case</span>${arrow}</a>
        </div>
        <div class="crs__controls">
          <span class="crs__counter" aria-hidden="true"><span data-crs-current>01</span><span> / <span data-crs-count>04</span></span></span>
          <button type="button" data-crs-prev aria-label="Previous case">${left}</button>
          <button type="button" data-crs-next aria-label="Next case">${arrow}</button>
          <button type="button" data-crs-play data-play-label="Play slideshow" data-pause-label="Pause slideshow" aria-label="Pause slideshow" aria-pressed="true">${pause}${play}</button>
        </div>
        <p class="crs__status" data-crs-status aria-live="polite" aria-atomic="true"></p>
      </section>
      <section class="crs__collection" id="cases" aria-labelledby="collection-title">
        <div class="crs__collection-heading"><h2 id="collection-title">Pick your personality.</h2><p>From a clear look to a little sparkle. Four ways to make it yours.</p></div>
        <div class="crs__picker" role="group" aria-label="Choose a case design">${picks}
        </div>
        <noscript><p>Explore a design in the Casify store:</p><ul>${designs.map(design => `<li><a href="${design.url}">${escape(design.productTitle)}</a></li>`).join('')}</ul></noscript>
      </section>
      <section class="crs__editorial" aria-labelledby="editorial-title">
        <h2 id="editorial-title">A case for every side of you.</h2>
        <div><p>Your phone goes where you go. Give it a look that feels like you: a silver finish, a clear silhouette, a little glitter or a touch of rose.</p><p>Once a design catches your eye, check its available options and choose your exact phone model on the product page.</p><a href="${store}/collections/all">Explore every case ↗</a></div>
      </section>
      <section class="crs__story" id="fit" aria-label="Find your fit in three steps">
        <div class="crs__details"><span class="crs__step">01</span><h3>Find your look.</h3><p>Choose the finish and design that feels like you. Start with one of the four cases above.</p></div>
        <div class="crs__details"><span class="crs__step">02</span><h3>Check your model.</h3><p>Open the product page and select your exact phone model from the available options.</p></div>
        <div class="crs__details"><span class="crs__step">03</span><h3>Make it yours.</h3><p>Review the selected style and model, then add your chosen case to your bag in the store.</p></div>
      </section>
    </casify-reel-showcase>
  </main>
  <footer class="preview-footer"><a class="preview-logo" href="#top" aria-label="Back to top">Casify.</a><p>Find your kind of case.<br>A little personality, every day.</p></footer>
  <script>${js.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`;

await mkdir(deliveryRoot, { recursive: true });
await Promise.all([
  writeFile(join(here, 'preview.html'), html, 'utf8'),
  writeFile(join(deliveryRoot, 'preview.html'), html, 'utf8'),
  writeFile(join(here, 'reference.json'), JSON.stringify({
    sourceVideo: 'C:\\Users\\LENOVO\\Downloads\\AQPbzkAGqUQ8aOb-m8xvy3kf_vpJ1cTSSyE2Y-ex5RwWgn0JkbhA1qrKtePAHY0Hy56uSoQFyPIkMVW4-ItAg_ESQwfa2izjfiluxOOG4w.mp4',
    intent: 'Adapt the reference reel into a Casify storefront concept: oversized design names, centered original product photography, changing colored line artwork, a four-design picker and concise shopping guidance.',
    imagePolicy: 'Original local catalog photographs embedded byte-for-byte as base64; no generation, recoloring, retouching or background removal.',
    productDataset: join(themeRoot, 'dev/og/products.json'),
    themeAssets: ['assets/cv-reel-showcase.css', 'assets/cv-reel-showcase.js'],
    offline: 'CSS, JavaScript and original product images are embedded. Optional Google fonts use local serif fallbacks when unavailable. Product and bag links open the real store.',
    tokens: { paper: '#FDF9F1', cocoa: '#33231A', brandRed: '#A8231F', display: 'Playfair Display, Georgia, serif', body: 'Libre Baskerville, Georgia, serif' },
    designs: designs.map(({ image, ...design }) => design)
  }, null, 2) + '\n', 'utf8')
]);
console.log(`Built local and standalone previews for ${designs.length} real catalog designs.`);
