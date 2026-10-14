/* The Best product template: scoped commerce controls and three motion layers. */
const bestInitialized = new WeakSet();
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let motionAnimate = null;

if (!prefersReducedMotion.matches) {
  import('https://cdn.jsdelivr.net/npm/motion@13.4.4/mini/+esm')
    .then((motion) => { motionAnimate = motion.animate; })
    .catch(() => {});
}

function bestMoney(cents, currency) {
  try {
    return new Intl.NumberFormat(document.documentElement.lang || 'en-US', {
      style: 'currency', currency: currency || 'USD'
    }).format((Number(cents) || 0) / 100);
  } catch (_) {
    return '$' + ((Number(cents) || 0) / 100).toFixed(2);
  }
}

function initBest(root) {
  if (!root || bestInitialized.has(root)) return;
  bestInitialized.add(root);

  const variantsNode = root.querySelector('[data-best-variants]');
  const form = root.querySelector('.best-form');
  if (!variantsNode || !form) return;
  let variants = [];
  try { variants = JSON.parse(variantsNode.textContent); } catch (_) { return; }
  const currency = root.dataset.currency;
  const mainImage = root.querySelector('[data-best-main-image]');
  const rail = root.querySelector('[data-best-rail]');
  const thumbs = Array.from(root.querySelectorAll('[data-best-image]'));
  const variantInput = root.querySelector('[data-best-variant-id]');
  const quantityInput = root.querySelector('[data-best-quantity]');
  const priceNode = root.querySelector('[data-best-price]');
  const compareNode = root.querySelector('[data-best-compare]');
  const saveNode = root.querySelector('[data-best-save]');
  const endPriceNode = root.querySelector('[data-best-end-price]');
  const addButton = root.querySelector('[data-best-add]');
  const buyButton = root.querySelector('[data-best-buy]');
  const buyButtonOriginal = buyButton.innerHTML;
  const errorNode = root.querySelector('[data-best-error]');

  function showError(message) {
    errorNode.textContent = message;
    errorNode.hidden = !message;
  }

  function selectImage(button) {
    if (!button || !mainImage) return;
    thumbs.forEach((thumb) => {
      const active = thumb === button;
      thumb.classList.toggle('is-active', active);
      thumb.setAttribute('aria-pressed', String(active));
    });
    mainImage.src = button.dataset.bestImage;
    mainImage.alt = button.dataset.bestAlt || '';
    if (motionAnimate && !prefersReducedMotion.matches) {
      motionAnimate(mainImage, { opacity: [0.72, 1], transform: ['scale(1.018)', 'scale(1)'] }, { duration: 0.32, easing: 'ease-out' });
    }
  }

  rail?.addEventListener('click', (event) => {
    const thumb = event.target.closest('[data-best-image]');
    if (thumb) selectImage(thumb);
  });
  root.querySelector('[data-best-gallery-prev]')?.addEventListener('click', () => rail?.scrollBy({ left: -210, behavior: 'smooth' }));
  root.querySelector('[data-best-gallery-next]')?.addEventListener('click', () => rail?.scrollBy({ left: 210, behavior: 'smooth' }));

  function selectedOptions() {
    const values = [];
    root.querySelectorAll('fieldset[data-best-option]').forEach((fieldset) => {
      const checked = fieldset.querySelector('input:checked');
      if (checked) values[Number(fieldset.dataset.bestOption)] = checked.value;
    });
    root.querySelectorAll('select[data-best-option]').forEach((select) => {
      values[Number(select.dataset.bestOption)] = select.value;
    });
    return values;
  }

  function updateVariant() {
    const selected = selectedOptions();
    const variant = variants.find((item) => item.options.every((option, index) => option === selected[index]));
    const available = Boolean(variant?.available);
    const price = variant?.price || 0;
    variantInput.value = variant?.id || '';
    priceNode.textContent = variant ? bestMoney(price, currency) : 'Unavailable';
    const buyPriceNode = root.querySelector('[data-best-buy-price]');
    if (buyPriceNode) buyPriceNode.textContent = variant ? bestMoney(price * Math.max(1, Number(quantityInput.value) || 1), currency) : '';
    if (endPriceNode) endPriceNode.textContent = variant ? bestMoney(price, currency) : '';
    const compare = Number(variant?.compare_at_price) || 0;
    compareNode.hidden = !(compare > price);
    saveNode.hidden = !(compare > price);
    if (compare > price) {
      compareNode.textContent = bestMoney(compare, currency);
      saveNode.textContent = 'Save ' + bestMoney(compare - price, currency);
    }
    addButton.disabled = !available;
    buyButton.disabled = !available;
    addButton.querySelector(':scope > span:last-child').textContent = available ? 'Add to cart' : (variant ? 'Sold out' : 'Unavailable');
    const modelInput = root.querySelector('.best-options--models input:checked');
    const styleInput = root.querySelector('.best-options--styles input:checked');
    const modelLabel = root.querySelector('[data-best-model-label]');
    const styleLabel = root.querySelector('[data-best-style-label]');
    if (modelLabel && modelInput) modelLabel.textContent = modelInput.value;
    if (styleLabel && styleInput) styleLabel.textContent = styleInput.value;
    if (variant) {
      const url = new URL(location.href);
      url.searchParams.set('variant', variant.id);
      history.replaceState(history.state, '', url);
    }
    showError('');
    return variant;
  }

  root.querySelectorAll('fieldset[data-best-option] input').forEach((input) => {
    input.addEventListener('change', () => {
      const variant = updateVariant();
      const imageUrl = variant?.featured_image?.src;
      if (imageUrl && mainImage) {
        mainImage.src = imageUrl;
        mainImage.alt = variant.featured_image.alt || root.querySelector('h1')?.textContent || '';
        thumbs.forEach((thumb) => { thumb.classList.remove('is-active'); thumb.setAttribute('aria-pressed', 'false'); });
      }
    });
  });
  root.querySelectorAll('select[data-best-option]').forEach((select) => select.addEventListener('change', updateVariant));
  root.querySelector('[data-best-more-models]')?.addEventListener('click', (event) => {
    const button = event.currentTarget;
    const group = button.closest('.best-options--models');
    const expanded = group.classList.toggle('is-expanded');
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Show fewer models' : `Show all ${group.querySelectorAll('.best-model').length} models`;
  });
  const checkedExtraModel = root.querySelector('.best-model--extra input:checked');
  if (checkedExtraModel) {
    const modelGroup = checkedExtraModel.closest('.best-options--models');
    modelGroup.classList.add('is-expanded');
    const moreButton = modelGroup.querySelector('[data-best-more-models]');
    if (moreButton) { moreButton.setAttribute('aria-expanded', 'true'); moreButton.textContent = 'Show fewer models'; }
  }
  root.querySelector('[data-best-decrease]')?.addEventListener('click', () => {
    quantityInput.value = Math.max(1, (parseInt(quantityInput.value, 10) || 1) - 1);
    updateVariant();
  });
  root.querySelector('[data-best-increase]')?.addEventListener('click', () => {
    quantityInput.value = Math.min(99, (parseInt(quantityInput.value, 10) || 1) + 1);
    updateVariant();
  });
  quantityInput.addEventListener('change', () => {
    quantityInput.value = Math.min(99, Math.max(1, parseInt(quantityInput.value, 10) || 1));
    updateVariant();
  });
  buyButton.addEventListener('click', async () => {
    const variant = updateVariant();
    if (!variant?.available) { showError('Choose an available model and style first.'); return; }
    buyButton.disabled = true;
    buyButton.textContent = 'Adding…';
    try {
      const addUrl = (root.dataset.cartUrl || '/cart/add').replace(/\/cart\/add\/?$/, '/cart/add.js');
      const response = await fetch(addUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: Number(variant.id), quantity: Number(quantityInput.value) || 1 }] })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.description || 'Could not add this item.');
      window.location.assign('/checkout');
    } catch (error) {
      showError(error.message || 'Could not continue to checkout. Please try again.');
      buyButton.disabled = false;
      buyButton.innerHTML = buyButtonOriginal;
      buyButton.querySelector('[data-best-buy-price]').textContent = bestMoney(variant.price * (Number(quantityInput.value) || 1), currency);
    }
  });

  if (!prefersReducedMotion.matches && window.gsap) {
    const gsap = window.gsap;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
    gsap.fromTo(root.querySelector('.best-gallery__stage > img'), { scale: 1.045 }, { scale: 1, duration: 1.1, ease: 'power3.out' });
    if (window.ScrollTrigger) {
      root.querySelectorAll('.best-story, .best-detail-grid, .best-bottom-grid').forEach((section) => {
        gsap.fromTo(section, { y: 22, opacity: 0.75 }, { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out', scrollTrigger: { trigger: section, start: 'top 92%', once: true } });
      });
    }
  }

  initBestMagnet(root);
  updateVariant();
}

async function initBestMagnet(root) {
  const canvas = root.querySelector('[data-best-magnet-canvas]');
  if (!canvas || prefersReducedMotion.matches || !window.IntersectionObserver) return;
  const observer = new IntersectionObserver(async (entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    try {
      const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js');
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.z = 7;
      const rings = new THREE.Group();
      for (let index = 0; index < 3; index++) {
        const mesh = new THREE.Mesh(
          new THREE.TorusGeometry(0.56 + index * 0.25, 0.018, 8, 80),
          new THREE.MeshBasicMaterial({ color: 0x7be4f5, transparent: true, opacity: 0.54 - index * 0.09, blending: THREE.AdditiveBlending })
        );
        mesh.rotation.x = 0.45;
        rings.add(mesh);
      }
      rings.position.x = 0.7;
      rings.position.y = -0.15;
      scene.add(rings);
      let visible = true;
      let frame = 0;
      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        renderer.setSize(rect.width, rect.height, false);
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
      };
      resize();
      const watch = new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting; if (visible) tick(); });
      watch.observe(canvas);
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
      function tick() {
        if (!visible || !canvas.isConnected) return;
        frame += 0.016;
        rings.rotation.z = Math.sin(frame * 0.8) * 0.08;
        rings.children.forEach((ring, index) => { ring.material.opacity = (0.42 - index * 0.08) + Math.sin(frame * 1.5 - index * 0.7) * 0.09; });
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
      }
      tick();
    } catch (_) {
      canvas.hidden = true;
    }
  }, { rootMargin: '150px' });
  observer.observe(canvas);
}

document.querySelectorAll('[data-best-product]').forEach(initBest);
document.addEventListener('shopify:section:load', (event) => event.target.querySelectorAll('[data-best-product]').forEach(initBest));
