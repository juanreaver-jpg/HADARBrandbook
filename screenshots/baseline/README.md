# Visual regression baselines

This directory holds the **approved** full-page screenshots of
`MainWebsiteMockup.html` at three breakpoints:

| File           | Viewport       |
| -------------- | -------------- |
| `desktop.png`  | 1440 × 900     |
| `tablet.png`   | 768 × 1024     |
| `mobile.png`   | 390 × 844      |

These images are the source of truth for the visual-regression check
(`scripts/visual-regression.js`). The script renders the page in headless
Chromium, screenshots each viewport, and pixel-diffs the result against the
files in this folder. A run fails when more than **5%** of pixels differ
(configurable via `VRT_TOLERANCE`). Anti-aliased pixels are ignored so the
check doesn't flap on subharmonic font-rendering noise.

## Per-section baselines

In addition to the three full-page shots, the script also screenshots a list
of individual page sections at each viewport and diffs them against
per-section baselines under:

```
screenshots/baseline/sections/<viewport>/<section>.png
```

Initial coverage: `hero`, `pillars`, `covenant`, `day`, `gallery`,
`curriculum`, `admissions`, `library`, `footer`. Each
section image is compared with the same tolerance as the full-page shots, so
a localized regression (e.g. a broken covenant card) fails the run on its own
instead of waiting until it pollutes enough of the page to trip the page-wide
diff.

### Adding a new section

1. Pick a stable CSS selector that wraps the area you care about. Prefer the
   section's `id` (`#admissions`, `#gallery`, …) or a unique class.
2. Open `scripts/visual-regression.js` and append an entry to the `SECTIONS`
   array near the top:

   ```js
   { name: 'admissions', selector: '#admissions' },
   ```

   `name` becomes the filename (`admissions.png`) — keep it short and
   lowercase. Selectors that don't match log a warning and are skipped rather
   than failing the run.
3. Run `npm run vrt:update` to record the first baseline for that section at
   every viewport. Review the new PNGs under
   `screenshots/baseline/sections/<viewport>/` before committing them.
4. From the next run onwards, any change inside that section that exceeds
   `VRT_TOLERANCE` will be reported as `<viewport>/<section>` in the summary.

## Running the check

The app must be served on `http://localhost:5000` (the `Start application`
workflow does this). Then, from the project root:

```bash
npm run vrt           # compare against baselines, exit 1 on regression
```

Per-run output is written to:

- `screenshots/current/<viewport>.png` — what the page looks like right now
- `screenshots/diff/<viewport>.png` — red pixels highlighting the differences

## Refreshing the baselines

After an **intentional** design change, re-record the baselines and commit them:

```bash
npm run vrt:update    # overwrites screenshots/baseline/*.png
```

Review the new PNGs visually before committing — once they land, future runs
treat them as correct.

## CI

The check also runs automatically on every push and pull request via
`.github/workflows/visual-regression.yml`. The job:

1. Boots `python3 -m http.server --directory public 5000` in the background.
2. Installs Playwright's Chromium build.
3. Runs `npm run vrt` against the live page.
4. Fails the build if any viewport exceeds the tolerance.

When the run fails, the per-viewport `current/` and `diff/` PNGs are
uploaded as a `vrt-diffs` workflow artifact so a reviewer can download
them from the GitHub Actions run page and see exactly what shifted. If
the change was intentional, refresh the baselines locally with
`npm run vrt:update` and commit the updated PNGs in
`screenshots/baseline/`.

## Tuning

Environment variables understood by the script:

| Variable                 | Default                                      | Meaning                                              |
| ------------------------ | -------------------------------------------- | ---------------------------------------------------- |
| `VRT_URL`                | `http://localhost:5000/MainWebsiteMockup.html` | Page under test                                      |
| `VRT_TOLERANCE`          | `0.05`                                       | Max fraction of pixels allowed to differ (0–1)       |
| `VRT_PIXEL_THRESHOLD`    | `0.2`                                        | Per-pixel color sensitivity passed to `pixelmatch`   |
