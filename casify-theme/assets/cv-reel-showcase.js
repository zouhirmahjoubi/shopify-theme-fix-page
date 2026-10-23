/* A small, dependency-free carousel shared by Shopify and the reference preview. */
(() => {
  if (customElements.get('casify-reel-showcase')) return;
  const svgStart = '<svg viewBox="0 0 1440 850" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke="currentColor" stroke-width="1.2">';
  const patterns = () => {
    const loops = Array.from({ length: 25 }, (_, i) => {
      const r = 35 + i * 28;
      return `<path d="M${720-r},425 C${720-r*1.2},${425-r*.9} ${720+r*.6},${425-r*1.1} ${720+r},${425-r*.3} S${720+r*.8},${425+r} ${720},${425+r*.8} S${720-r*1.1},${425+r*.3} ${720-r},425Z"/>`;
    }).join('');
    const waves = Array.from({ length: 25 }, (_, i) => {
      const y = i * 43 - 110;
      return `<path d="M-100 ${y} Q80 ${y-180} 260 ${y} T620 ${y} T980 ${y} T1340 ${y} T1700 ${y}"/>`;
    }).join('');
    const petals = Array.from({ length: 30 }, (_, i) => {
      const x = (i % 6) * 280 - 15, y = Math.floor(i / 6) * 240 - 70;
      return `<g transform="translate(${x} ${y}) rotate(${i * 17})">${Array.from({ length: 6 }, (_, j) => `<ellipse cx="0" cy="43" rx="18" ry="43" transform="rotate(${j * 60})"/>`).join('')}<circle r="7"/></g>`;
    }).join('');
    const flames = Array.from({ length: 25 }, (_, i) => {
      const x = i * 80 - 230;
      return `<path d="M${x} 1000 C${x+220} 750 ${x-160} 700 ${x+100} 460 S${x+80} 170 ${x+220} -150"/>`;
    }).join('');
    return svgStart + `<g data-crs-pattern="contour">${loops}</g><g data-crs-pattern="wave">${waves}</g><g data-crs-pattern="petal">${petals}</g><g data-crs-pattern="flame">${flames}</g></g></svg>`;
  };

  class CasifyReelShowcase extends HTMLElement {
    connectedCallback() {
      if (this._abort) return;
      this._abort = new AbortController();
      this._slides = Array.from(this.querySelectorAll('[data-crs-slide]'));
      this._picks = Array.from(this.querySelectorAll('[data-crs-pick]'));
      this._index = 0;
      this._animations = [];
      this._motion = matchMedia('(prefers-reduced-motion: reduce)');
      this._playing = this.dataset.autoplay === 'true' && !this._motion.matches;
      this._suspended = new Set();
      this._art = this.querySelector('[data-crs-art]');
      if (this._art && !this._art.querySelector('svg')) this._art.innerHTML = patterns();
      if (!this._slides.length) return;
      const listen = (target, type, callback) => target?.addEventListener(type, callback, { signal: this._abort.signal });
      this._picks.forEach((pick, index) => listen(pick, 'click', () => this.select(index, true)));
      listen(this.querySelector('[data-crs-prev]'), 'click', () => this.select(this._index - 1, true));
      listen(this.querySelector('[data-crs-next]'), 'click', () => this.select(this._index + 1, true));
      listen(this.querySelector('[data-crs-play]'), 'click', () => {
        this._playing = !this._playing;
        if (this._playing) {
          this._suspended.delete('focus');
          this._suspended.delete('pointer');
        }
        this.updatePlayButton();
        this.schedule();
      });
      listen(this, 'keydown', event => {
        const pick = event.target.closest('[data-crs-pick]');
        if (!pick || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? this._slides.length - 1 : this._index + (event.key === 'ArrowRight' ? 1 : -1);
        this.select(index, true);
        this._picks[this._index]?.focus({ preventScroll: true });
      });
      listen(this, 'pointerenter', () => { this._suspended.add('pointer'); this.schedule(); });
      listen(this, 'pointerleave', () => { this._suspended.delete('pointer'); this.schedule(); this.resetLean(); });
      listen(this, 'focusin', () => { this._suspended.add('focus'); this.schedule(); });
      listen(this, 'focusout', event => { if (!this.contains(event.relatedTarget)) { this._suspended.delete('focus'); this.schedule(); } });
      listen(document, 'visibilitychange', () => {
        document.hidden ? this._suspended.add('hidden') : this._suspended.delete('hidden');
        this.schedule();
      });
      listen(this._motion, 'change', () => {
        if (this._motion.matches) {
          this._playing = false;
          this.resetLean();
          this._animations.forEach(animation => animation.cancel());
          this._slides.forEach((slide, index) => { slide.hidden = index !== this._index; });
        }
        this.updatePlayButton(); this.schedule();
      });
      const stage = this.querySelector('.crs__stage');
      let pointerStart = null;
      listen(stage, 'pointerdown', event => { if (event.pointerType !== 'mouse') pointerStart = { x: event.clientX, y: event.clientY }; });
      listen(stage, 'pointerup', event => {
        if (!pointerStart) return;
        const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) this.select(this._index + (dx < 0 ? 1 : -1), true);
        pointerStart = null;
      });
      listen(stage, 'pointercancel', () => { pointerStart = null; });
      listen(stage, 'pointermove', event => {
        if (this._motion.matches || event.pointerType !== 'mouse') return;
        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        stage.style.transform = `translate(${x * 12}px, ${y * 8}px) rotate(${x * 2}deg)`;
      });
      listen(stage, 'pointerleave', () => this.resetLean());
      listen(document, 'shopify:block:select', event => {
        const index = this._slides.findIndex(slide => slide.contains(event.target) || slide.dataset.blockId === event.detail?.blockId);
        if (index >= 0) { this._playing = false; this.select(index, false); this.updatePlayButton(); }
      });
      if ('IntersectionObserver' in window) {
        this._observer = new IntersectionObserver(entries => {
          entries[0].isIntersecting ? this._suspended.delete('offscreen') : this._suspended.add('offscreen');
          this.schedule();
        }, { threshold: .2 });
        this._observer.observe(this.querySelector('.crs__hero') || this);
      }
      this.select(0, false);
      this.updatePlayButton();
    }

    select(index, animate = true, announce = true) {
      if (!this._slides?.length) return;
      const next = (index + this._slides.length) % this._slides.length;
      const previous = this._slides[this._index];
      const slide = this._slides[next];
      const changed = next !== this._index;
      this._animations.forEach(animation => animation.cancel());
      this._animations = [];
      this._slides.forEach(item => { item.hidden = item !== slide; item.classList.toggle('is-active', item === slide); });
      this._index = next;
      const upcomingImage = this._slides[(next + 1) % this._slides.length].querySelector('img');
      if (upcomingImage) upcomingImage.loading = 'eager';
      for (const property of ['bg', 'ink', 'accent']) if (slide.dataset[property]) this.style.setProperty(`--crs-${property}`, slide.dataset[property]);
      const setText = (selector, value) => { const target = this.querySelector(selector); if (target && value != null) target.textContent = value; return target; };
      const word = setText('[data-crs-word]', slide.dataset.name);
      setText('[data-crs-title]', slide.dataset.title);
      setText('[data-crs-copy]', slide.dataset.copy);
      setText('[data-crs-current]', String(next + 1).padStart(2, '0'));
      setText('[data-crs-count]', String(this._slides.length).padStart(2, '0'));
      const link = this.querySelector('[data-crs-link]');
      if (link) {
        link.href = slide.dataset.url || '#';
        const label = link.querySelector('[data-crs-link-label]');
        if (label && slide.dataset.cta) label.textContent = slide.dataset.cta;
      }
      const pattern = slide.dataset.pattern || 'contour';
      if (this._art) {
        this._art.dataset.pattern = pattern;
        this._art.querySelectorAll('[data-crs-pattern]').forEach(group => group.classList.toggle('is-active', group.dataset.crsPattern === pattern));
      }
      this._picks.forEach((pick, i) => pick.setAttribute('aria-pressed', String(i === next)));
      if (changed && animate && !this._motion.matches && typeof slide.animate === 'function') {
        previous.hidden = false;
        const leaving = previous.animate([
          { opacity: 1, transform: 'translate(0,0) rotate(0)' },
          { opacity: 0, transform: 'translate(-65px,22px) rotate(-7deg)' }
        ], { duration: 340, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
        leaving.finished.then(() => { if (previous !== this._slides[this._index]) previous.hidden = true; }).catch(() => {});
        const arriving = slide.animate([
          { opacity: 0, transform: 'translate(80px,-18px) rotate(8deg)' },
          { opacity: 1, transform: 'translate(0,0) rotate(0)' }
        ], { duration: 780, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
        this._animations.push(leaving, arriving);
        if (word) this._animations.push(word.animate([
          { opacity: .08, transform: 'translateY(18px) scale(.97)' },
          { opacity: .25, transform: 'translateY(0) scale(1)' }
        ], { duration: 750, easing: 'cubic-bezier(.16,1,.3,1)' }));
      }
      const status = this.querySelector('[data-crs-status]');
      if (status && changed && announce) status.textContent = `${slide.dataset.title}. ${next + 1} / ${this._slides.length}`;
      this.schedule();
    }

    updatePlayButton() {
      const button = this.querySelector('[data-crs-play]');
      if (!button) return;
      // The label itself says what a press does ("Play" / "Pause"), so no aria-pressed: a toggle's name must not change with its state.
      const playLabel = button.dataset.labelPlay || button.dataset.playLabel || 'Play slideshow';
      const pauseLabel = button.dataset.labelPause || button.dataset.pauseLabel || 'Pause slideshow';
      button.setAttribute('aria-label', this._playing ? pauseLabel : playLabel);
      const label = button.querySelector('[data-crs-play-label]');
      if (label) label.textContent = this._playing ? pauseLabel : playLabel;
      button.querySelector('[data-crs-pause-icon]')?.toggleAttribute('hidden', !this._playing);
      button.querySelector('[data-crs-play-icon]')?.toggleAttribute('hidden', this._playing);
      button.disabled = this._slides.length < 2;
      this.querySelector('[data-crs-prev]')?.toggleAttribute('disabled', this._slides.length < 2);
      this.querySelector('[data-crs-next]')?.toggleAttribute('disabled', this._slides.length < 2);
    }

    schedule() {
      clearTimeout(this._timer);
      if (this._playing && !this._suspended.size && this._slides.length > 1) this._timer = setTimeout(() => this.select(this._index + 1, true, false), 6200);
    }

    resetLean() { const stage = this.querySelector('.crs__stage'); if (stage) stage.style.transform = ''; }

    disconnectedCallback() {
      clearTimeout(this._timer);
      this._observer?.disconnect();
      this._animations?.forEach(animation => animation.cancel());
      this._abort?.abort();
      this._abort = null;
    }
  }
  customElements.define('casify-reel-showcase', CasifyReelShowcase);
})();
