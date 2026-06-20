#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch').default || require('pixelmatch');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_DIR = path.join(ROOT, 'screenshots', 'baseline');
const CURRENT_DIR = path.join(ROOT, 'screenshots', 'current');
const DIFF_DIR = path.join(ROOT, 'screenshots', 'diff');

const URL = process.env.VRT_URL || 'http://localhost:5000/MainWebsiteMockup.html';
const TOLERANCE = parseFloat(process.env.VRT_TOLERANCE || '0.05'); // 5% of pixels
const PIXEL_THRESHOLD = parseFloat(process.env.VRT_PIXEL_THRESHOLD || '0.2');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

// Per-section coverage. Each entry pairs a short name with a CSS selector;
// the named element is screenshotted and diffed against
// `screenshots/baseline/sections/<viewport>/<name>.png`. Add a new section by
// appending another { name, selector } here — see screenshots/baseline/README.md.
const SECTIONS = [
  { name: 'hero', selector: '#school' },
  { name: 'pillars', selector: '#pillars' },
  { name: 'covenant', selector: '#covenant' },
  { name: 'day', selector: '#day' },
  { name: 'gallery', selector: '#gallery' },
  { name: 'curriculum', selector: '#curriculum' },
  { name: 'admissions', selector: '#admissions' },
  { name: 'library', selector: '#library' },
  { name: 'footer', selector: 'footer.footer-colophon' },
];

const args = process.argv.slice(2);
const UPDATE = args.includes('--update') || args.includes('-u');

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

async function openPage(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    // ignore — some assets keep the network busy; we still wait for images below
  }
  // Disable animations/transitions/video backgrounds for stability.
  // The hero video frame changes between captures, so VRT uses the poster image.
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}.hero-video{opacity:0!important}`,
  });
  // Best-effort wait for fonts and in-flight images, capped so a single
  // stalled asset can never hang the run.
  await page.evaluate(async () => {
    const fontsReady = document.fonts && document.fonts.ready
      ? document.fonts.ready
      : Promise.resolve();
    const imgs = Array.from(document.images).filter((i) => !i.complete);
    const imgsReady = Promise.all(
      imgs.map(
        (img) =>
          new Promise((res) => {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', res, { once: true });
          })
      )
    );
    const timeout = new Promise((res) => setTimeout(res, 8000));
    await Promise.race([Promise.all([fontsReady, imgsReady]), timeout]);
  });
  await page.waitForTimeout(500);
  return { context, page };
}

async function captureFullPage(page) {
  return page.screenshot({ fullPage: true, type: 'png' });
}

async function captureSection(page, selector) {
  const handle = await page.$(selector);
  if (!handle) return null;
  // Scroll into view so lazy-loaded content paints, then screenshot the element.
  await handle.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(150);
  return handle.screenshot({ type: 'png' });
}

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function compare(baselineFile, currentFile, diffFile) {
  const a = readPng(baselineFile);
  const b = readPng(currentFile);
  if (a.width !== b.width || a.height !== b.height) {
    return {
      ok: false,
      reason: `dimension mismatch (baseline ${a.width}x${a.height} vs current ${b.width}x${b.height})`,
      ratio: 1,
    };
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const mismatched = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold: PIXEL_THRESHOLD,
    includeAA: false,
    alpha: 0.3,
  });
  fs.writeFileSync(diffFile, PNG.sync.write(diff));
  const ratio = mismatched / (a.width * a.height);
  return { ok: ratio <= TOLERANCE, ratio, mismatched, total: a.width * a.height };
}

(async () => {
  ensureDir(BASELINE_DIR);
  ensureDir(CURRENT_DIR);
  ensureDir(DIFF_DIR);

  const executablePath = process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
  const browser = await chromium.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  let failures = 0;
  const results = [];

  // Run one image through the baseline-or-compare flow and collect the result.
  function processShot(buf, label, baselineFile, currentFile, diffFile) {
    ensureDir(path.dirname(baselineFile));
    ensureDir(path.dirname(currentFile));
    ensureDir(path.dirname(diffFile));

    if (UPDATE || !fs.existsSync(baselineFile)) {
      fs.writeFileSync(baselineFile, buf);
      console.log(`[vrt] ${UPDATE ? 'updated' : 'created'} baseline → ${path.relative(ROOT, baselineFile)}`);
      results.push({ label, status: 'baseline-written' });
      return;
    }

    fs.writeFileSync(currentFile, buf);
    const res = compare(baselineFile, currentFile, diffFile);
    if (res.ok) {
      console.log(`[vrt] ✔ ${label} matches baseline (${(res.ratio * 100).toFixed(3)}% diff)`);
      results.push({ label, status: 'pass', ratio: res.ratio });
    } else {
      failures++;
      console.error(
        `[vrt] ✘ ${label} differs: ${res.reason || `${(res.ratio * 100).toFixed(3)}% pixels changed (tolerance ${(TOLERANCE * 100).toFixed(3)}%)`}`
      );
      console.error(`       diff image: ${path.relative(ROOT, diffFile)}`);
      results.push({ label, status: 'fail', ratio: res.ratio, reason: res.reason });
    }
  }

  try {
    for (const vp of VIEWPORTS) {
      console.log(`[vrt] capturing ${vp.name} (${vp.width}x${vp.height})…`);
      const { context, page } = await openPage(browser, vp);
      try {
        // Full-page shot first (preserves the existing top-level baselines).
        const fileName = `${vp.name}.png`;
        const fullBuf = await captureFullPage(page);
        processShot(
          fullBuf,
          vp.name,
          path.join(BASELINE_DIR, fileName),
          path.join(CURRENT_DIR, fileName),
          path.join(DIFF_DIR, fileName)
        );

        // Then each registered section, scoped to this viewport.
        for (const sec of SECTIONS) {
          const label = `${vp.name}/${sec.name}`;
          const secBuf = await captureSection(page, sec.selector);
          if (!secBuf) {
            console.warn(`[vrt] ⚠ ${label} — selector not found (${sec.selector}); skipping`);
            results.push({ label, status: 'skipped-missing-selector' });
            continue;
          }
          const secFile = `${sec.name}.png`;
          processShot(
            secBuf,
            label,
            path.join(BASELINE_DIR, 'sections', vp.name, secFile),
            path.join(CURRENT_DIR, 'sections', vp.name, secFile),
            path.join(DIFF_DIR, 'sections', vp.name, secFile)
          );
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log('\n[vrt] summary:');
  for (const r of results) console.log(`  - ${r.label}: ${r.status}${r.ratio != null ? ` (${(r.ratio * 100).toFixed(3)}%)` : ''}`);

  if (failures > 0) {
    console.error(`\n[vrt] ${failures} viewport(s) failed. If the change was intentional, refresh baselines with:\n  npm run vrt:update`);
    process.exit(1);
  }
  console.log('\n[vrt] all viewports match baselines.');
})().catch((err) => {
  console.error('[vrt] error:', err);
  process.exit(2);
});
