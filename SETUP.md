# HADAR Brand Book — Setup

A mostly-static brand-book site (`public/`) served by a thin Flask backend
(`app.py`) that also builds one download (`/downloads/illustrations-kit.zip`)
on demand. This guide gets a fresh clone running.

## Requirements

- **Python ≥ 3.11**
- **Node ≥ 20** (only needed for the visual-regression tests in `scripts/`)
- Git LFS, if you want the large tracked zip in `public/assets/downloads/`
  (`hadar-school-materials.zip`) to come down as the real file rather than an
  LFS pointer:
  ```bash
  git lfs install
  git lfs pull
  ```

## Run the site

Python deps are declared in `pyproject.toml` (`flask`, `gunicorn`).

```bash
# install deps (pick one)
pip install flask gunicorn          # plain pip
# or, with uv:  uv sync

# serve on http://localhost:5000
gunicorn --bind 0.0.0.0:5000 --workers 1 --threads 4 --timeout 120 app:app
```

For quick local iteration you can also run `python app.py` (Flask dev server),
but production / deployment uses the gunicorn command above (autoscale target,
`publicDir = public`).

`app.py` serves every file under `public/` at its normal path and exposes the
one dynamic endpoint below. It serves **only** from `public/`.

## Downloads

The site links four downloads from the Visual Identity / gallery sections:

| Download | Source |
|---|---|
| `assets/downloads/hadar-brand-fonts.zip` | static, committed |
| `assets/downloads/hadar-logo-kit.zip` | static, committed |
| `assets/downloads/hadar-school-materials.zip` | static, committed (Git LFS) |
| `/downloads/illustrations-kit.zip` | **built on demand** by `app.py` |

The illustrations kit is **not** a committed file. On each request `app.py`
parses `public/index.html`, finds the gallery groups whose heading matches
*"Founder illustrations"* and *"Tools of Learning"* (`KIT_GROUPS` in `app.py`),
collects those `<img src>` files from `public/`, and zips them. Add, remove, or
rename an image in either gallery group and the download updates automatically —
no rebuild step. (Rebuild instructions for the three static zips live in
`replit.md`.)

## Visual regression tests (optional)

Baselines live in `screenshots/baseline/` and are committed. Per-run output
(`screenshots/current/`, `screenshots/diff/`) is git-ignored.

```bash
npm install
npx playwright install chromium
# with the site running on :5000
npm run vrt          # compare against committed baselines
npm run vrt:update   # re-write baselines after an intentional visual change
```

## Assets & images

- Served images in `public/assets/` are web-optimized (large illustrations
  resized to ~1600px long edge; oversized PNGs converted to WebP). They are
  sized for display, not print.
- The original full-resolution masters and the source-staging folder
  `attached_assets/` are **not** in the repo (they were git-ignored working
  material). If you need to regenerate a higher-res asset or rebuild a kit from
  source, restore them from the project's source backup archive.

## CSS architecture

The mockup stylesheet is split into numbered files under `public/assets/css/`
loaded in order; the numeric prefix controls the cascade. See the "CSS
architecture" section of `replit.md` before adding or reordering rules.

## A note on repo size

The working tree is lean, but the Git **history** still contains past commits of
large binaries. A plain clone therefore downloads more than the working tree's
size. For a minimal handoff, consider a shallow clone (`git clone --depth 1`) or
a fresh history (squash) — neither changes the working files.
