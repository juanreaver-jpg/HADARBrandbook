# HADAR Brand Book

Mostly-static HTML site (single `index.html` with supporting assets) for the HADAR brand book, served by a thin Flask backend (`app.py`) that also generates one download on demand.

## Setup
- See `SETUP.md` for clone-to-run instructions (deps, serve command, downloads, VRT).
- The served site lives in `public/` (`index.html`, `MainWebsiteMockup.html`, `prompting-guide.html`, and `assets/`). Everything else (`screenshots/baseline/`, `scripts/`, configs) is source/dev material kept outside the served tree.
- **Assets are web-optimized.** Served images in `public/assets/` are sized for display, not print: large illustrations/photos are resized to ~1600px on the long edge (JPEG q82) and oversized PNGs (book covers, `Moses_full`, the art-direction shadows) were converted to WebP. Original full-res masters and the former `attached_assets/` staging folder are **not** in the repo — restore them from the project source backup archive if you need to regenerate a higher-res asset.
- **`.gitignore`:** `attached_assets/` and `.local/` are ignored; `screenshots/` is ignored *except* `screenshots/baseline/` (the committed VRT baselines), via the `screenshots/*` + `!screenshots/baseline/` form. Do not collapse that back to a bare `screenshots/` rule or the baselines stop being tracked.
- Served via Flask (`app.py`) on port 5000, run under gunicorn (workflow: `Start application` → `gunicorn --bind 0.0.0.0:5000 --workers 1 --threads 4 --timeout 120 app:app`). The previous pure-static `python3 -m http.server` setup was replaced so the dynamic download endpoint can run server-side.
- `app.py` serves every file in `public/` exactly as before (same paths, query strings ignored as usual) and adds the dynamic endpoint below. It serves *only* from `public/` — `attached_assets/` and `screenshots/` are not exposed.
- Deployment is `autoscale`, running the same gunicorn command. It is no longer `static` because the site now needs a backend.
- **Why only `public/` is served (and was the static publicDir):** the old static deployment capped at 1GB and bundled *every git-tracked file in publicDir*. `attached_assets/` (~441MB) and `screenshots/` (~57MB) are git-*ignored*, so they were already excluded from the static bundle by `.gitignore` and are likewise excluded from the autoscale deployment image. Keep large unserved source assets git-ignored and out of `public/`.

## Dynamic illustrations download (`/downloads/illustrations-kit.zip`)

`app.py` exposes `GET /downloads/illustrations-kit.zip`, which builds a zip **on demand** from whatever images are currently referenced in the gallery on `public/index.html` — there is no pre-baked archive committed to the repo.

- **Gallery-driven:** on each request it parses `public/index.html`, finds the `.ad-gallery-category` blocks whose `.ad-gallery-cat-head` matches "Founder illustrations" or "Tools of Learning" (see `KIT_GROUPS` in `app.py`), collects the `<img src>` values in those groups, and resolves them to files under `public/`. Adding/removing/renaming an image in either gallery group automatically changes the download — no rebuild step.
- **Zip layout:** top-level `hadar-illustrations-kit/` with `Founder Illustrations/` and `Tools of Learning/` subfolders plus a generated `README.txt` (usage + rights/provenance: authorized HADAR brand use only, no redistribution).
- **Robustness:** a missing/unresolvable image reference is skipped (logged) rather than 500-ing the whole download. Paths are constrained to inside `public/`.
- **Caching:** the built zip is cached in-process, keyed on the resolved file set + each file's mtime/size, so repeat downloads are fast but the zip still updates whenever the gallery markup or an underlying image changes.
- **On-page entry point:** the Visual Identity download block in `public/index.html` has an "Illustrations Kit" `.font-download` card whose button points at `/downloads/illustrations-kit.zip` (the only download card not pointing at a static `assets/downloads/*.zip`).

## CSS architecture

The stylesheet is split into 20 numbered files under `assets/css/`, loaded in order from the `<head>` of `MainWebsiteMockup.html`:

- `00-tokens.css` — design tokens (colors, fonts, spacing variables)
- `01-animations.css` — base keyframes and animation utilities
- `02-hero.css` — hero section
- `03-covenant.css` — covenant section
- `04-day.css` — "A Day at Hadar" section
- `05-transition.css` — inter-section transitions
- `06-gallery.css` — gallery section
- `07-library.css` — library section
- `08-admissions.css` — admissions section
- `09-footer.css` — footer
- `10-animations-refinement.css` — animation tweaks layered on top of `01`
- `11-responsive.css` — responsive/media-query rules
- `12-elegance-pass.css` — global typographic/visual polish pass
- `13-section-polish.css` — per-section polish overrides
- `14-nav-hero-overlay.css` — nav + hero overlay adjustments
- `15-ornate-and-seams.css` — ornamental dividers and section seams
- `16-navbar.css` — navbar refinements
- `17-section-finals.css` — final per-section corrections
- `18-curriculum.css` — curriculum section
- `19-reading-list.css` — reading list section

**The numeric prefix matters.** Files in the `10`–`19` range contain override layers that depend on the base section files (`02`–`09`) and tokens (`00`) being loaded first. Reshuffling the `<link>` order will silently break the cascade.

When adding a new rule:
- If it belongs to an existing section and isn't overriding anything, add it to that section's file (e.g. a new hero rule goes in `02-hero.css`).
- If it's an override that must win against an existing section file, add it to the appropriate later file (e.g. `13-section-polish.css` or `17-section-finals.css`), or create a new numbered file with a higher prefix and append a matching `<link>` at the end of the block in `MainWebsiteMockup.html`.

(`brand-book.css` also exists in the folder but is not currently linked from the page.)

## Brand font kit (`assets/downloads/hadar-brand-fonts.zip`)

Downloadable zip linked from the Visual Identity section of `index.html`. Contains three families, each in its own subfolder, plus a top-level `README.txt`:

- `Quadrat Serial/` — sourced from `attached_assets/quadrat_serial_1779726461280.zip` (wordmark font; preserves all weights that ship in that archive). The upstream archive ships no license text, so a project-authored `NOTICE.txt` is added to this subfolder spelling out the rights/provenance situation (authorized HADAR brand use only; no redistribution).
- `Libre Bodoni/` — v2002 OTFs (Regular / Medium / Bold + italics = weights 400 / 500 / 700) from https://github.com/impallari/Libre-Bodoni, with `OFL.txt`.
- `Inter/` — Inter v4.0 TTFs (Regular, Medium, SemiBold, Bold + italics = weights 400 / 500 / 600 / 700) from https://github.com/rsms/inter/releases/tag/v4.0, with `OFL.txt`.

To rebuild: recreate a `fonts/` directory at the project root mirroring the structure above, then zip it into `assets/downloads/hadar-brand-fonts.zip` with a top-level `hadar-brand-fonts/` folder inside the archive. The unpacked `fonts/` source folder is intentionally not committed — only the zip is.

## Logo kit (`assets/downloads/hadar-logo-kit.zip`)

Downloadable zip linked from the Visual Identity section of `index.html` (the Logo Kit card sits immediately before the Brand Font Kit card). Built from the V3 logo package `attached_assets/Logo_LockupsV3_1780072752935.zip`. Archive structure (top-level `hadar-logo-kit/` folder inside the zip):

- `lockups/` — all 15 marks as individual SVGs (`Hadar_Logo_Lockups-01.svg` … `-15.svg`): the canonical lockup, the supporting marks, and the simplified versions.
- `source/Hadar_Logo_Lockups.ai` — the layered Illustrator source from the V3 package.
- `README.txt` — project-authored usage notes + rights/provenance (authorized HADAR brand use only; no redistribution).

To rebuild: extract `attached_assets/Logo_LockupsV3_1780072752935.zip`, assemble a `hadar-logo-kit/` folder with `lockups/` (the 15 SVGs), `source/` (the `.ai`), and `README.txt`, then zip it so the archive has a top-level `hadar-logo-kit/` folder.

### Lockup section assets (`assets/HADAR_Lockups/`)

The on-page Lockup Variations section (`#lockups`) is organized into three groups: the **canonical mark** (Variant 01, highlighted with a "Canonical Mark" badge), the **supporting marks**, and the **simplified versions**. The simplified marks were added from the V3 package and follow the existing `hadar-lockup-NN.svg` numbering:

- `hadar-lockup-12.svg` … `-17.svg` ← V3 `Hadar_Logo_Lockups-09/10/13/14/12/11.svg` respectively (solid ephod stacked, solid ephod horizontal, solid ephod standalone, crest with simplified rays, crowned ephod no rays, crown standalone).
- The canonical + supporting marks (`hadar-lockup-03/04/05/07/08/09/10/11.svg`) correspond to V3 marks 01–08.

The click-to-zoom lightbox in `assets/js/brand-book.js` auto-discovers every `.lockup-item`, so new items work without JS changes.

## User preferences
