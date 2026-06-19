#!/bin/bash
set -e
# Flask-backed site: ensure Python deps (flask, gunicorn) are installed.
if command -v uv >/dev/null 2>&1; then
  uv sync --frozen || uv sync
else
  echo "post-merge: uv not found, skipping dependency sync."
fi
echo "post-merge: done."
