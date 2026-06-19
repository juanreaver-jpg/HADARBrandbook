  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Scroll progress bar
  const progress = document.getElementById('progress');
  const onScroll = () => {
    const h = document.documentElement;
    const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    progress.style.width = pct + '%';
  };
  document.addEventListener('scroll', onScroll, { passive: true });

  // Side TOC active state
  const links = Array.from(document.querySelectorAll('.toc a'));
  const sections = links.map(a => {
    const href = a.getAttribute('href');
    // Extract the hash fragment from full URLs or use as-is for local anchors
    const hash = href.includes('#') ? '#' + href.split('#')[1] : href;
    return document.querySelector(hash);
  });
  const tocIo = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = '#' + e.target.id;
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(s => s && tocIo.observe(s));

  // Subtle parallax on hero image + figures
  const parallaxNodes = document.querySelectorAll('[data-parallax]');
  let ticking = false;
  document.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      parallaxNodes.forEach(el => {
        const r = el.getBoundingClientRect();
        const center = (r.top + r.bottom) / 2 - window.innerHeight / 2;
        const factor = parseFloat(el.dataset.parallax || '0.1');
        el.style.transform = `translateY(${-center * factor}px)`;
      });
      ticking = false;
    });
  }, { passive: true });



    // ─────────── PRESENTATION LIGHTBOX (Radiant Crest + Lockup variants) ───────────
    (function setupPresentationLightbox() {
      const overlay = document.getElementById('presLightbox');
      if (!overlay) return;
      const frameEl = document.getElementById('presLightboxFrame');
      const imgEl = document.getElementById('presLightboxImg');
      const svgEl = document.getElementById('presLightboxSvg');
      const labelEl = document.getElementById('presLightboxLabel');
      const descEl = document.getElementById('presLightboxDesc');
      const counterEl = document.getElementById('presLightboxCounter');
      const closeBtn = overlay.querySelector('.pres-lightbox-close');
      const prevBtn = overlay.querySelector('.pres-lightbox-prev');
      const nextBtn = overlay.querySelector('.pres-lightbox-next');

      // Build the sequence: all four Brand Marks in DOM order, then every lockup tile.
      const items = [];
      document.querySelectorAll('.bm-lineup .bm-mark').forEach(fig => {
        const frame = fig.querySelector('.bm-mark-frame');
        if (!frame) return;
        const cap = fig.querySelector('figcaption');
        const num = cap ? cap.querySelector('.bm-num') : null;
        const h3 = cap ? cap.querySelector('h3') : null;
        const p = cap ? cap.querySelector('p') : null;
        const label = [num && num.textContent.trim(), h3 && h3.textContent.trim()]
          .filter(Boolean).join(' · ');
        const img = frame.querySelector('img');
        const svg = frame.querySelector('.mark-svg svg');
        const base = {
          trigger: frame,
          label: label || (h3 ? h3.textContent.trim() : 'Brand Mark'),
          desc: p ? p.textContent.trim() : '',
          dark: false
        };
        if (img) {
          items.push(Object.assign(base, {
            type: 'img',
            src: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || ''
          }));
        } else if (svg) {
          // Capture a clone of the SVG so the lightbox can render it without
          // pulling the live node out of the page.
          const clone = svg.cloneNode(true);
          clone.removeAttribute('width');
          clone.removeAttribute('height');
          clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          items.push(Object.assign(base, {
            type: 'svg',
            svgHTML: clone.outerHTML,
            alt: h3 ? h3.textContent.trim() : 'Brand mark'
          }));
        }
      });
      document.querySelectorAll('.lockup-item').forEach(item => {
        const frame = item.querySelector('.lockup-frame');
        const img = item.querySelector('img');
        const meta = item.querySelector('.lockup-meta');
        const info = item.querySelector('.lockup-info');
        if (!frame || !img) return;
        items.push({
          trigger: frame,
          type: 'img',
          src: img.getAttribute('src'),
          alt: img.getAttribute('alt') || '',
          label: meta ? meta.textContent.trim() : '',
          desc: info ? info.textContent.trim() : '',
          dark: frame.classList.contains('lockup-frame--dark')
        });
      });

      if (!items.length) return;

      let current = 0;
      let lastFocus = null;

      function render() {
        const it = items[current];
        if (it.type === 'svg') {
          imgEl.hidden = true;
          imgEl.removeAttribute('src');
          imgEl.alt = '';
          svgEl.hidden = false;
          svgEl.innerHTML = it.svgHTML;
          svgEl.setAttribute('aria-label', it.alt || it.label || '');
        } else {
          svgEl.hidden = true;
          svgEl.innerHTML = '';
          imgEl.hidden = false;
          imgEl.src = it.src;
          imgEl.alt = it.alt;
        }
        labelEl.textContent = it.label;
        descEl.textContent = it.desc;
        counterEl.textContent = (current + 1) + ' / ' + items.length;
        frameEl.classList.toggle('pres-lightbox-frame--dark', !!it.dark);
        // Reset zoom state whenever we navigate to a new item.
        setZoom(false);
      }

      // ─── Click-to-zoom inside the lightbox ───
      let zoomed = false;
      function setZoom(state, originX, originY) {
        zoomed = !!state;
        frameEl.classList.toggle('pres-lightbox-frame--zoomed', zoomed);
        imgEl.classList.toggle('pres-lightbox-img--zoomed', zoomed);
        if (zoomed && originX != null && originY != null) {
          imgEl.style.transformOrigin = originX + '% ' + originY + '%';
        } else {
          imgEl.style.transformOrigin = '50% 50%';
        }
      }
      imgEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (zoomed) {
          setZoom(false);
        } else {
          const r = imgEl.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * 100;
          const y = ((e.clientY - r.top) / r.height) * 100;
          setZoom(true, x, y);
        }
      });
      // Swallow clicks on the SVG wrapper so the overlay click-outside doesn't close.
      svgEl.addEventListener('click', (e) => { e.stopPropagation(); });
      frameEl.addEventListener('click', (e) => {
        // Click on the frame margins (not the image itself) also exits zoom.
        if (e.target === frameEl && zoomed) setZoom(false);
      });

      function openAt(index) {
        current = (index + items.length) % items.length;
        lastFocus = document.activeElement;
        render();
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        // Move focus into the dialog for keyboard users.
        requestAnimationFrame(() => closeBtn && closeBtn.focus());
      }

      function close() {
        if (!overlay.classList.contains('open')) return;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (lastFocus && typeof lastFocus.focus === 'function') {
          lastFocus.focus();
        }
      }

      function next() { current = (current + 1) % items.length; render(); }
      function prev() { current = (current - 1 + items.length) % items.length; render(); }

      // Wire triggers — make each clickable + keyboard-activatable.
      items.forEach((it, i) => {
        const t = it.trigger;
        t.classList.add('pres-trigger');
        t.setAttribute('role', 'button');
        t.setAttribute('tabindex', '0');
        t.setAttribute('aria-label', 'Open ' + (it.label || it.alt || 'mark') + ' in full-screen preview');
        t.addEventListener('click', () => openAt(i));
        t.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openAt(i);
          }
        });
      });

      closeBtn.addEventListener('click', close);
      prevBtn.addEventListener('click', prev);
      nextBtn.addEventListener('click', next);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });

      // Keyboard: arrows navigate, Escape closes, Tab traps focus while open.
      document.addEventListener('keydown', (e) => {
        if (!overlay.classList.contains('open')) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); next(); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); return; }
        if (e.key === 'Tab') {
          const focusables = [closeBtn, prevBtn, nextBtn];
          const idx = focusables.indexOf(document.activeElement);
          if (idx === -1) { e.preventDefault(); closeBtn.focus(); return; }
          e.preventDefault();
          const dir = e.shiftKey ? -1 : 1;
          const nextIdx = (idx + dir + focusables.length) % focusables.length;
          focusables[nextIdx].focus();
        }
      });
    })();

    // Lightbox
    const lb = document.createElement('div');
    lb.className = 'lb-overlay';
    lb.innerHTML = `
      <button class="lb-close" aria-label="Close">&#x2715;</button>
      <div class="lb-inner">
        <img class="lb-img" src="" alt="">
        <p class="lb-caption"></p>
      </div>`;
    document.body.appendChild(lb);

    const lbImg = lb.querySelector('.lb-img');
    const lbCaption = lb.querySelector('.lb-caption');

    function openLightbox(src, alt, caption) {
      lbImg.src = src;
      lbImg.alt = alt;
      lbCaption.textContent = caption || '';
      lb.classList.add('lb-open');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lb.classList.remove('lb-open');
      document.body.style.overflow = '';
    }

    lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
    lb.addEventListener('click', function(e) {
      if (e.target === lb) closeLightbox();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeLightbox();
    });

    document.querySelectorAll('.ad-gallery-grid .img-wrap').forEach(function(wrap) {
      wrap.addEventListener('click', function() {
        const img = wrap.querySelector('img');
        const fig = wrap.closest('figure');
        const caption = fig ? fig.querySelector('figcaption') : null;
        openLightbox(img.src, img.alt, caption ? caption.textContent.trim() : '');
      });
    });



    // ─────────── LOGO DOWNLOADER ───────────
    (function setupLogoDownloader() {
      const root = document.getElementById('logoDownloader');
      if (!root) return;
      const selectEl = document.getElementById('logoDlSelect');
      const swatchesEl = document.getElementById('logoDlSwatches');
      const sizesEl = document.getElementById('logoDlSizes');
      const formatsEl = document.getElementById('logoDlFormats');
      const sizeFieldEl = document.getElementById('logoDlSizeField');
      const previewEl = document.getElementById('logoDlPreview');
      const markEl = document.getElementById('logoDlMark');
      const btnEl = document.getElementById('logoDlBtn');
      const allBtnEl = document.getElementById('logoDlAllBtn');
      const matrixBtnEl = document.getElementById('logoDlMatrixBtn');
      const progressEl = document.getElementById('logoDlProgress');
      if (!selectEl || !swatchesEl || !sizesEl || !previewEl || !markEl || !btnEl) return;

      const COLORS = [
        { key: 'ink',      name: 'Ink',      hex: '#3D2914', light: false },
        { key: 'haggadah', name: 'Haggadah', hex: '#8C1C2B', light: false },
        { key: 'lapis',    name: 'Lapis',    hex: '#1F3A6E', light: false },
        { key: 'gold',     name: 'Gold',     hex: '#B8842A', light: false },
        { key: 'vellum',   name: 'Vellum',   hex: '#F4EBD8', light: true  }
      ];

      // Plain-language size choices, each mapping to a target longest-side
      // dimension fed to the canvas rasterizer below.
      const SIZES = [
        { key: 'web',      name: 'Web',      note: 'Email & screens', target: 800  },
        { key: 'standard', name: 'Standard', note: 'Slides & docs',   target: 2400 },
        { key: 'print',    name: 'Print',    note: 'Large format',    target: 4000 }
      ];

      // Output formats. PNG rasterizes at the chosen size; SVG hands back the
      // scalable vector source, recolored to the selected brand color.
      const FORMATS = [
        { key: 'png', name: 'PNG', note: 'Transparent image' },
        { key: 'svg', name: 'SVG', note: 'Scalable vector' }
      ];

      // Discover every logo present in the Lockup Variations section, reusing
      // the friendly names already shown on each card.
      const logos = [];
      document.querySelectorAll('#lockups .lockup-item').forEach(item => {
        const img = item.querySelector('img');
        const meta = item.querySelector('.lockup-meta');
        if (!img || !meta) return;
        const full = meta.textContent.trim();
        // Strip the leading "Variant 01 — " / "Simplified 03 — " designation
        // for the friendly label, keep the full text for the dropdown.
        const friendly = full.split('—').slice(1).join('—').trim() || full;
        logos.push({ src: img.getAttribute('src'), label: full, friendly: friendly });
      });
      if (!logos.length) return;

      logos.forEach((logo, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = logo.label;
        selectEl.appendChild(opt);
      });

      let currentLogo = 0;
      let currentColor = COLORS[0];
      let currentSize = SIZES[1];
      let currentFormat = FORMATS[0];

      COLORS.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'logo-dl-swatch';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
        btn.setAttribute('aria-label', c.name);
        btn.innerHTML = '<span class="logo-dl-swatch-chip" style="background:' + c.hex + '"></span><span>' + c.name + '</span>';
        btn.addEventListener('click', () => {
          currentColor = c;
          swatchesEl.querySelectorAll('.logo-dl-swatch').forEach((el, j) => {
            el.setAttribute('aria-checked', j === i ? 'true' : 'false');
          });
          updatePreview();
        });
        swatchesEl.appendChild(btn);
      });

      SIZES.forEach((s, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'logo-dl-size';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', s === currentSize ? 'true' : 'false');
        btn.setAttribute('aria-label', s.name + ' — ' + s.note);
        btn.innerHTML = '<span class="logo-dl-size-name">' + s.name + '</span><span class="logo-dl-size-note">' + s.note + '</span>';
        btn.addEventListener('click', () => {
          currentSize = s;
          sizesEl.querySelectorAll('.logo-dl-size').forEach((el, j) => {
            el.setAttribute('aria-checked', j === i ? 'true' : 'false');
          });
        });
        sizesEl.appendChild(btn);
      });

      if (formatsEl) {
        FORMATS.forEach((f, i) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'logo-dl-size';
          btn.setAttribute('role', 'radio');
          btn.setAttribute('aria-checked', f === currentFormat ? 'true' : 'false');
          btn.setAttribute('aria-label', f.name + ' — ' + f.note);
          btn.innerHTML = '<span class="logo-dl-size-name">' + f.name + '</span><span class="logo-dl-size-note">' + f.note + '</span>';
          btn.addEventListener('click', () => {
            currentFormat = f;
            formatsEl.querySelectorAll('.logo-dl-size').forEach((el, j) => {
              el.setAttribute('aria-checked', j === i ? 'true' : 'false');
            });
            updateFormatUI();
          });
          formatsEl.appendChild(btn);
        });
      }

      // SVGs are resolution-independent, so the size choice only applies to PNG.
      // Dim and disable the size field and relabel the buttons for the format.
      function updateFormatUI() {
        const isSvg = currentFormat.key === 'svg';
        if (sizeFieldEl) sizeFieldEl.classList.toggle('is-disabled', isSvg);
        btnEl.textContent = 'Download ' + currentFormat.name;
        if (allBtnEl) allBtnEl.textContent = 'Download all (ZIP)';
      }

      function updatePreview() {
        const logo = logos[currentLogo];
        const maskVal = 'url("' + logo.src + '") center / contain no-repeat';
        markEl.style.webkitMask = maskVal;
        markEl.style.mask = maskVal;
        markEl.style.backgroundColor = currentColor.hex;
        previewEl.classList.toggle('is-dark', !!currentColor.light);
        markEl.setAttribute('aria-label', logo.friendly + ' in ' + currentColor.name);
      }

      selectEl.addEventListener('change', () => {
        currentLogo = parseInt(selectEl.value, 10) || 0;
        updatePreview();
      });

      function slugify(s) {
        return s.toLowerCase()
          .replace(/[·•]/g, ' ')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      }

      // Resolve a logo's true width/height by parsing the SVG source. Some marks
      // (the simplified ones) declare only a viewBox and no width/height, which
      // makes <img>.naturalWidth unreliable — parsing keeps aspect ratios exact.
      async function getSvgSize(src) {
        try {
          const res = await fetch(src);
          const text = await res.text();
          const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
          const svg = doc.documentElement;
          const wAttr = parseFloat(svg.getAttribute('width'));
          const hAttr = parseFloat(svg.getAttribute('height'));
          if (wAttr > 0 && hAttr > 0) return { w: wAttr, h: hAttr };
          const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(parseFloat);
          if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) return { w: vb[2], h: vb[3] };
        } catch (e) { /* fall through to defaults */ }
        return null;
      }

      // Fetch a logo's SVG source and recolor it to a single brand color,
      // mirroring the PNG pipeline (every visible fill becomes one solid color).
      // Preserves fill:none / fill="none" so transparent regions stay open.
      async function recolorSvg(src, color) {
        const res = await fetch(src);
        let text = await res.text();
        text = text.replace(/fill\s*:\s*([^;"}\s]+)/gi, (m, val) => {
          return /none/i.test(val) ? m : 'fill:' + color.hex;
        });
        text = text.replace(/fill\s*=\s*"([^"]*)"/gi, (m, val) => {
          return /none/i.test(val) ? m : 'fill="' + color.hex + '"';
        });
        return text;
      }

      // --- Minimal client-side ZIP writer (STORE method, no compression) ---
      // PNGs are already compressed, so storing them keeps the code tiny while
      // still producing a valid archive any OS can open. No external library.
      function crc32(bytes) {
        let table = crc32._t;
        if (!table) {
          table = crc32._t = new Uint32Array(256);
          for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            table[n] = c >>> 0;
          }
        }
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
        return (crc ^ 0xFFFFFFFF) >>> 0;
      }

      function makeZip(files) {
        const encoder = new TextEncoder();
        const u16 = (n) => [n & 0xFF, (n >>> 8) & 0xFF];
        const u32 = (n) => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];
        const parts = [];
        const central = [];
        let offset = 0;
        files.forEach((f) => {
          const nameBytes = encoder.encode(f.name);
          const data = f.data;
          const crc = crc32(data);
          const local = new Uint8Array([].concat(
            u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
            u32(crc), u32(data.length), u32(data.length),
            u16(nameBytes.length), u16(0)
          ));
          parts.push(local, nameBytes, data);
          central.push({ nameBytes: nameBytes, crc: crc, size: data.length, offset: offset });
          offset += local.length + nameBytes.length + data.length;
        });
        const centralParts = [];
        let centralSize = 0;
        central.forEach((c) => {
          const header = new Uint8Array([].concat(
            u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
            u32(c.crc), u32(c.size), u32(c.size),
            u16(c.nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0),
            u32(c.offset)
          ));
          centralParts.push(header, c.nameBytes);
          centralSize += header.length + c.nameBytes.length;
        });
        const end = new Uint8Array([].concat(
          u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
          u32(centralSize), u32(offset), u16(0)
        ));
        return new Blob(parts.concat(centralParts, [end]), { type: 'application/zip' });
      }

      // Rasterize one logo in one brand color to a transparent PNG blob,
      // reusing the canvas recolor pipeline (drawImage + source-in).
      async function rasterize(logo, color, sizeChoice) {
        const [img, size] = await Promise.all([loadImage(logo.src), getSvgSize(logo.src)]);
        // Prefer parsed dimensions, then the raster's intrinsic size, then square.
        let w = (size && size.w) || img.naturalWidth || img.width || 1000;
        let h = (size && size.h) || img.naturalHeight || img.height || 1000;
        if (!w || !h) { w = h = 1000; }
        // Scale so the longest side matches the chosen size's target.
        const target = (sizeChoice && sizeChoice.target) || 2400;
        const scale = target / Math.max(w, h);
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');

        // Draw the SVG, then keep only its silhouette and flood it with the
        // chosen brand color via source-in — works regardless of the SVG's
        // own hardcoded fills, on a fully transparent background.
        ctx.drawImage(img, 0, 0, cw, ch);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = color.hex;
        ctx.fillRect(0, 0, cw, ch);

        return await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            blob ? resolve(blob) : reject(new Error('Canvas export failed'));
          }, 'image/png');
        });
      }

      function triggerDownload(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      function setProgress(msg) {
        if (!progressEl) return;
        if (msg) {
          progressEl.textContent = msg;
          progressEl.hidden = false;
        } else {
          progressEl.textContent = '';
          progressEl.hidden = true;
        }
      }

      async function download() {
        const logo = logos[currentLogo];
        const color = currentColor;
        btnEl.disabled = true;
        if (allBtnEl) allBtnEl.disabled = true;
        if (matrixBtnEl) matrixBtnEl.disabled = true;
        const originalText = btnEl.textContent;
        btnEl.textContent = 'Preparing…';
        try {
          if (currentFormat.key === 'svg') {
            const svgText = await recolorSvg(logo.src, color);
            const blob = new Blob([svgText], { type: 'image/svg+xml' });
            triggerDownload(blob, 'hadar-' + slugify(logo.friendly) + '-' + color.key + '.svg');
          } else {
            const blob = await rasterize(logo, color, currentSize);
            triggerDownload(blob, 'hadar-' + slugify(logo.friendly) + '-' + color.key + '-' + currentSize.key + '.png');
          }
        } catch (err) {
          console.error('Logo download failed:', err);
        } finally {
          btnEl.textContent = originalText;
          btnEl.disabled = false;
          if (allBtnEl) allBtnEl.disabled = false;
          if (matrixBtnEl) matrixBtnEl.disabled = false;
        }
      }

      // Bundle every logo in the selected color into a single zip. Rasterizing
      // ~14 high-res PNGs takes a moment, so we report progress as we go.
      async function downloadAll() {
        if (!allBtnEl) return;
        const color = currentColor;
        const sizeChoice = currentSize;
        const format = currentFormat;
        const isSvg = format.key === 'svg';
        const encoder = new TextEncoder();
        btnEl.disabled = true;
        allBtnEl.disabled = true;
        if (matrixBtnEl) matrixBtnEl.disabled = true;
        const originalText = allBtnEl.textContent;
        allBtnEl.textContent = 'Preparing…';
        try {
          const files = [];
          const usedNames = Object.create(null);
          for (let i = 0; i < logos.length; i++) {
            setProgress('Rendering logo ' + (i + 1) + ' of ' + logos.length + '…');
            let data, ext;
            if (isSvg) {
              const svgText = await recolorSvg(logos[i].src, color);
              data = encoder.encode(svgText);
              ext = '.svg';
            } else {
              const blob = await rasterize(logos[i], color, sizeChoice);
              data = new Uint8Array(await blob.arrayBuffer());
              ext = '.png';
            }
            // Guard against two friendly names slugifying to the same file.
            const sizePart = isSvg ? '' : '-' + sizeChoice.key;
            let name = 'hadar-' + slugify(logos[i].friendly) + '-' + color.key + sizePart + ext;
            if (usedNames[name]) {
              name = name.replace(new RegExp(ext.replace('.', '\\.') + '$'), '-' + (i + 1) + ext);
            }
            usedNames[name] = true;
            files.push({ name: name, data: data });
          }
          setProgress('Packaging zip…');
          const zipBlob = makeZip(files);
          const zipSizePart = isSvg ? '' : '-' + sizeChoice.key;
          triggerDownload(zipBlob, 'hadar-logos-' + color.key + zipSizePart + '-' + format.key + '.zip');
          setProgress('Done — ' + files.length + ' logos downloaded.');
          setTimeout(() => setProgress(''), 4000);
        } catch (err) {
          console.error('Bulk logo download failed:', err);
          setProgress('Something went wrong. Please try again.');
        } finally {
          allBtnEl.textContent = originalText;
          allBtnEl.disabled = false;
          btnEl.disabled = false;
          if (matrixBtnEl) matrixBtnEl.disabled = false;
        }
      }

      // Bundle every logo in every brand color into one zip, organized into
      // per-color subfolders (ink/, haggadah/, …). This is the full library —
      // ~14 logos × 5 colors — so progress reflects the larger job.
      async function downloadMatrix() {
        if (!matrixBtnEl) return;
        const sizeChoice = currentSize;
        const total = logos.length * COLORS.length;
        btnEl.disabled = true;
        if (allBtnEl) allBtnEl.disabled = true;
        matrixBtnEl.disabled = true;
        const originalText = matrixBtnEl.textContent;
        matrixBtnEl.textContent = 'Preparing…';
        try {
          const files = [];
          let done = 0;
          for (let c = 0; c < COLORS.length; c++) {
            const color = COLORS[c];
            const usedNames = Object.create(null);
            for (let i = 0; i < logos.length; i++) {
              done++;
              setProgress('Rendering ' + done + ' of ' + total + '… (' + color.name + ')');
              const blob = await rasterize(logos[i], color, sizeChoice);
              // Guard against two friendly names slugifying to the same file
              // within a color subfolder.
              let base = 'hadar-' + slugify(logos[i].friendly) + '-' + color.key + '-' + sizeChoice.key + '.png';
              if (usedNames[base]) {
                base = base.replace(/\.png$/, '-' + (i + 1) + '.png');
              }
              usedNames[base] = true;
              files.push({ name: color.key + '/' + base, data: new Uint8Array(await blob.arrayBuffer()) });
            }
          }
          setProgress('Packaging zip…');
          const zipBlob = makeZip(files);
          triggerDownload(zipBlob, 'hadar-logos-all-colors-' + sizeChoice.key + '.zip');
          setProgress('Done — ' + files.length + ' logos across ' + COLORS.length + ' colors downloaded.');
          setTimeout(() => setProgress(''), 4000);
        } catch (err) {
          console.error('Color matrix download failed:', err);
          setProgress('Something went wrong. Please try again.');
        } finally {
          matrixBtnEl.textContent = originalText;
          matrixBtnEl.disabled = false;
          if (allBtnEl) allBtnEl.disabled = false;
          btnEl.disabled = false;
        }
      }

      btnEl.addEventListener('click', download);
      if (allBtnEl) allBtnEl.addEventListener('click', downloadAll);
      if (matrixBtnEl) matrixBtnEl.addEventListener('click', downloadMatrix);

      // Initial render.
      updateFormatUI();
      updatePreview();
    })();
