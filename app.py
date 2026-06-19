"""HADAR brand book server.

Serves the static site in ``public/`` exactly as the previous
``python3 -m http.server`` setup did, and adds a single dynamic endpoint that
builds the illustrations download kit on demand from whatever images are
currently referenced in the gallery on ``index.html``.
"""

import io
import os
import re
import threading
import zipfile
from html.parser import HTMLParser

from flask import Flask, Response, abort, send_from_directory

PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
INDEX_HTML = os.path.join(PUBLIC_DIR, "index.html")

# The two gallery groups whose images make up the downloadable kit. The keys
# are matched against the text of each ``.ad-gallery-cat-head``; the values are
# the subfolder names used inside the generated zip.
KIT_GROUPS = {
    "founder illustrations": "Founder Illustrations",
    "tools of learning": "Tools of Learning",
}

ZIP_ROOT = "hadar-illustrations-kit"
ZIP_FILENAME = "hadar-illustrations-kit.zip"

app = Flask(__name__, static_folder=None)


class _GalleryParser(HTMLParser):
    """Collect ``<img>`` sources grouped by gallery category.

    The gallery markup looks like::

        <div class="ad-gallery-category ...">
          <div class="ad-gallery-cat-head">— Founder illustrations</div>
          ...
          <div class="img-wrap"><img src="..."></div>
          ...
        </div>

    We track the current category by watching ``ad-gallery-category`` open/close
    via a depth counter, and capture the heading text to label the group.
    """

    def __init__(self):
        super().__init__(convert_charrefs=True)
        # List of (heading_text, [src, ...]) in document order.
        self.groups = []
        self._depth = 0  # div nesting depth inside the current category
        self._in_category = False
        self._capture_head = False
        self._head_buf = []
        self._current_srcs = None
        self._current_head = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = (attrs.get("class") or "").split()
        if tag == "div":
            if "ad-gallery-category" in classes and not self._in_category:
                self._in_category = True
                self._depth = 1
                self._current_srcs = []
                self._current_head = ""
                return
            if self._in_category:
                self._depth += 1
                if "ad-gallery-cat-head" in classes:
                    self._capture_head = True
                    self._head_buf = []
        elif tag == "img" and self._in_category:
            src = attrs.get("src")
            if src:
                self._current_srcs.append(src)

    def handle_endtag(self, tag):
        if tag == "div" and self._in_category:
            if self._capture_head:
                self._capture_head = False
                self._current_head = "".join(self._head_buf).strip()
            self._depth -= 1
            if self._depth == 0:
                self.groups.append((self._current_head, self._current_srcs))
                self._in_category = False
                self._current_srcs = None
                self._current_head = None

    def handle_data(self, data):
        if self._capture_head:
            self._head_buf.append(data)


def _normalize(text):
    return re.sub(r"[^a-z0-9 ]", "", text.lower()).strip()


def resolve_kit_files():
    """Return ``[(subfolder, src, abspath), ...]`` for the kit groups.

    Parses ``index.html`` live so the download always reflects the current
    gallery. Missing files on disk are skipped (logged) rather than raising.
    """
    with open(INDEX_HTML, "r", encoding="utf-8") as fh:
        html = fh.read()

    parser = _GalleryParser()
    parser.feed(html)

    resolved = []
    for head, srcs in parser.groups:
        norm = _normalize(head)
        subfolder = None
        for needle, folder in KIT_GROUPS.items():
            if needle in norm:
                subfolder = folder
                break
        if subfolder is None:
            continue
        for src in srcs:
            rel = src.lstrip("./").split("?", 1)[0].split("#", 1)[0]
            abspath = os.path.normpath(os.path.join(PUBLIC_DIR, rel))
            # Stay inside the served tree.
            if not abspath.startswith(PUBLIC_DIR + os.sep):
                continue
            resolved.append((subfolder, src, abspath))
    return resolved


_cache_lock = threading.Lock()
_cache = {"key": None, "data": None}


def _cache_key(files):
    parts = []
    for subfolder, _src, abspath in files:
        try:
            mtime = os.path.getmtime(abspath)
            size = os.path.getsize(abspath)
        except OSError:
            mtime = size = -1
        parts.append(f"{subfolder}|{abspath}|{mtime}|{size}")
    return "\n".join(sorted(parts))


def _readme_text(files):
    present = [(s, p) for (s, src, p) in files if os.path.isfile(p)]
    founder = sum(1 for s, _ in present if s == "Founder Illustrations")
    tools = sum(1 for s, _ in present if s == "Tools of Learning")
    return (
        "HADAR ILLUSTRATIONS KIT\n"
        "=======================\n\n"
        "This kit contains the HADAR brand illustrations as currently shown in\n"
        "the gallery of the HADAR brand book. It is generated on demand, so it\n"
        "always reflects whatever images are live in the gallery at download\n"
        "time — there is no fixed, pre-baked archive.\n\n"
        "Contents\n"
        "--------\n"
        f"Founder Illustrations/  — {founder} chromolithograph plates: lone\n"
        "                          historical figures and sweeping scenes.\n"
        f"Tools of Learning/      — {tools} curriculum anchors and pillars: the\n"
        "                          emblems of the Hadar curriculum.\n\n"
        "Usage\n"
        "-----\n"
        "These illustrations are part of the HADAR visual identity. Use them in\n"
        "their original form and palette. Do not recolor, distort, or redraw\n"
        "them.\n\n"
        "Rights & provenance\n"
        "-------------------\n"
        "These illustrations are the HADAR brand identity. They are provided for\n"
        "authorized HADAR brand use only and may not be redistributed or used to\n"
        "represent any other organization.\n"
    )


def build_kit_zip():
    files = resolve_kit_files()
    key = _cache_key(files)
    with _cache_lock:
        if _cache["key"] == key and _cache["data"] is not None:
            return _cache["data"]

    buf = io.BytesIO()
    seen = set()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for subfolder, _src, abspath in files:
            if not os.path.isfile(abspath):
                app.logger.warning("Illustrations kit: missing file %s", abspath)
                continue
            name = os.path.basename(abspath)
            arcname = f"{ZIP_ROOT}/{subfolder}/{name}"
            if arcname in seen:
                continue
            seen.add(arcname)
            zf.write(abspath, arcname)
        zf.writestr(f"{ZIP_ROOT}/README.txt", _readme_text(files))

    data = buf.getvalue()
    with _cache_lock:
        _cache["key"] = key
        _cache["data"] = data
    return data


@app.route("/downloads/illustrations-kit.zip")
def illustrations_kit():
    data = build_kit_zip()
    return Response(
        data,
        mimetype="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{ZIP_FILENAME}"',
            "Content-Length": str(len(data)),
            "Cache-Control": "no-cache",
        },
    )


@app.route("/")
def root():
    return send_from_directory(PUBLIC_DIR, "index.html")


@app.route("/<path:path>")
def static_files(path):
    full = os.path.normpath(os.path.join(PUBLIC_DIR, path))
    if not full.startswith(PUBLIC_DIR):
        abort(404)
    if os.path.isdir(full):
        index = os.path.join(full, "index.html")
        if os.path.isfile(index):
            return send_from_directory(full, "index.html")
        abort(404)
    if not os.path.isfile(full):
        abort(404)
    return send_from_directory(PUBLIC_DIR, path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
