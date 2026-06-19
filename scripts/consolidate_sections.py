#!/usr/bin/env python3
"""Consolidate scattered hero / covenant / gallery / footer CSS overrides
into single authoritative blocks (one per major section), mirroring the
existing "NAVBAR -- single authoritative block" pattern.

Strategy:
  * Leave each section's BASE definition block in place (with a header
    pointing to the consolidated overrides block).
  * Lift every later override block for the section out of its current
    position and concatenate them in source order into a single
    consolidated block placed at that section's chosen destination.
  * Replace each lifted block with a one-line breadcrumb comment that
    points to the consolidated block.

Cascade safety:
  * Within a section, the moved blocks keep their original relative
    source order, so the cascade among them is unchanged.
  * Moves are always to a LATER position in the file. Selectors that
    only appear in the moved-out region keep their relative win order.
  * Other sections' rules are not touched.

Run from the project root.
"""
from __future__ import annotations
from pathlib import Path

SRC = Path("public/MainWebsiteMockup.html")

# Each (start, end) is 1-indexed, inclusive. The line BEFORE start and
# the line AFTER end are NOT touched. Ranges must be strictly increasing
# and non-overlapping per section.
PLAN = {
    "HERO": {
        "ranges": [
            (2344, 2416),  # HERO COMPOSITION + scroll-cue + media
            (2535, 2564),  # HERO CREST + keyframes
            (2609, 2619),  # calmed hero motion + keyframes
            (3023, 3140),  # full-bleed cinematic recomp + media
            (3767, 3784),  # hero seam fade
        ],
        # Insert after this line (1-indexed). 4204 is the last line of
        # the existing "HERO OVERLAY" rule (section.hero::after { ... }).
        "insert_after": 4204,
        "header": [
            "",
            "    /* ===================================================================",
            "       HERO -- single authoritative block",
            "       -------------------------------------------------------------------",
            "       Every hero override (CTA button, scroll cue, crest treatment,",
            "       calmed ambient motion, full-bleed cinematic recomposition, the",
            "       hero -> covenant seam fade, and the uniform overlay wash) lives",
            "       in this single block. The base .hero / .hero-* definitions still",
            "       live near line 484 ('HERO SECTION'); this block is the final",
            "       cascade layer that lands on top of them. Earlier draft / polish-",
            "       pass blocks were lifted out and replaced with one-line",
            "       breadcrumb comments pointing back here.",
            "       =================================================================== */",
            "",
        ],
        "footer": [
            "",
            "    /* === end HERO -- single authoritative block === */",
            "",
        ],
    },
    "COVENANT": {
        "ranges": [
            (1704, 1707),  # .covenant-image transition (parallax)
            (2297, 2301),  # .covenant-text .eyebrow color discipline
            (2323, 2328),  # .covenant-quote framing
            (2419, 2441),  # chip-style Plate II + anchored right column
            (2520, 2521),  # remove PLATE II caption per user request
            (2620, 2627),  # covenant-image calmed motion + keyframes
            (2664, 2682),  # editorial body type + drop cap
            (3786, 3800),  # hero -> covenant seam (covenant side)
            (4028, 4044),  # full-bleed Ken Burns + keyframes
            (4303, 4306),  # seam safety background-color
        ],
        # Insert after line 4216, which is the closing `}` of the
        # `.covenant::before { ... }` rule inside the HERO -> COVENANT
        # SEAM block. That is the latest pre-navbar covenant rule.
        "insert_after": 4216,
        "header": [
            "",
            "    /* ===================================================================",
            "       COVENANT -- single authoritative block",
            "       -------------------------------------------------------------------",
            "       Every covenant override (parallax transition, eyebrow / quote",
            "       color discipline, anchored Plate II chip, calmed Ken Burns",
            "       motion, drop-cap body rhythm, hero seam fade, and the seam-",
            "       safety background) lives in this single block. The base",
            "       .covenant / .covenant-* definitions still live near line 708",
            "       ('FROM COVENANT TO CONSTITUTION'); this block is the final",
            "       cascade layer that lands on top of them. Earlier draft /",
            "       polish-pass blocks were lifted out and replaced with one-line",
            "       breadcrumb comments pointing back here.",
            "       =================================================================== */",
            "",
        ],
        "footer": [
            "",
            "    /* === end COVENANT -- single authoritative block === */",
            "",
        ],
    },
    "GALLERY": {
        "ranges": [
            (2684, 2772),  # ELEGANCE PASS -- restrained editorial controls
            (3543, 3680),  # GALLERY editorial redesign (frame, scrim, nav)
            (3754, 3757),  # hide duplicate meta caption + justify-between
            (4012, 4017),  # caption span fix + hide gallery-meta row
        ],
        # Insert after line 4875, which is the closing `}` of the
        # parchment-restore section.gallery::before rule -- the latest
        # gallery rule before the navbar block.
        "insert_after": 4875,
        "header": [
            "",
            "    /* ===================================================================",
            "       GALLERY -- single authoritative block",
            "       -------------------------------------------------------------------",
            "       Every gallery override (restrained editorial nav + counter,",
            "       editorial redesign of the carousel frame / scrim / caption,",
            "       duplicate-meta-caption cleanup, and the parchment-bg restore)",
            "       lives in this single block. The base .gallery / .gallery-*",
            "       definitions still live near line 1167 ('GALLERY'); this block",
            "       is the final cascade layer that lands on top of them. Earlier",
            "       draft / polish-pass blocks were lifted out and replaced with",
            "       one-line breadcrumb comments pointing back here.",
            "       =================================================================== */",
            "",
        ],
        "footer": [
            "",
            "    /* === end GALLERY -- single authoritative block === */",
            "",
        ],
    },
    "FOOTER": {
        "ranges": [
            (2502, 2518),  # I. FOOTER -- brighten crest + lift tagline
        ],
        # Insert after line 2913, which is the closing `}` of the
        # COLOPHON FOOTER's .footer-colophon .footer-bottom rule -- the
        # last colophon styling line.
        "insert_after": 2913,
        "header": [
            "",
            "    /* ===================================================================",
            "       FOOTER -- single authoritative block",
            "       -------------------------------------------------------------------",
            "       Every footer override beyond the base footer block (the",
            "       brightened crest + lifted tagline polish) is folded in here,",
            "       directly underneath the COLOPHON FOOTER rules above. The base",
            "       .footer / .footer-* definitions still live near line 1547",
            "       ('FOOTER'); the colophon redesign above plus this trailing",
            "       block together form the single authoritative override layer.",
            "       Earlier draft / polish-pass blocks were lifted out and replaced",
            "       with one-line breadcrumb comments pointing back here.",
            "       =================================================================== */",
            "",
        ],
        "footer": [
            "",
            "    /* === end FOOTER -- single authoritative block === */",
            "",
        ],
    },
}


def breadcrumb(section: str) -> str:
    return (
        f"    /* (moved to '{section} -- single authoritative block' "
        f"further down in this file.) */\n"
    )


def main() -> None:
    raw = SRC.read_text().splitlines(keepends=True)
    n = len(raw)

    # Validate ranges: no overlap across sections, all within file.
    every_range = []
    for sect, cfg in PLAN.items():
        for (s, e) in cfg["ranges"]:
            assert 1 <= s <= e <= n, f"{sect}: bad range {s}-{e}"
            every_range.append((s, e, sect))
    every_range.sort()
    for i in range(1, len(every_range)):
        prev_s, prev_e, prev_sect = every_range[i - 1]
        s, e, sect = every_range[i]
        assert prev_e < s, (
            f"overlap: {prev_sect} {prev_s}-{prev_e} vs {sect} {s}-{e}"
        )

    # Verify each section's insert_after is NOT inside any extracted range
    # (otherwise we'd lose the insertion point).
    for sect, cfg in PLAN.items():
        ia = cfg["insert_after"]
        for (s, e) in cfg["ranges"]:
            assert not (s <= ia <= e), (
                f"{sect}: insert_after {ia} sits inside extracted range {s}-{e}"
            )

    # Map each 1-indexed line -> action.
    # For extract: start_line -> (end_line, section)
    extract_starts: dict[int, tuple[int, str]] = {}
    for sect, cfg in PLAN.items():
        for (s, e) in cfg["ranges"]:
            extract_starts[s] = (e, sect)
    # For insert: after_line -> section (insert section's block AFTER it)
    insert_after_map: dict[int, str] = {
        cfg["insert_after"]: sect for sect, cfg in PLAN.items()
    }
    # Sanity check: insertion points are unique per line.
    assert len(insert_after_map) == len(PLAN), "insert_after collision"

    extracted: dict[str, list[str]] = {sect: [] for sect in PLAN}

    out: list[str] = []
    i = 1  # 1-indexed line cursor
    while i <= n:
        if i in extract_starts:
            end, sect = extract_starts[i]
            # raw is 0-indexed; copy lines i..end inclusive
            block = raw[i - 1:end]
            # Drop a trailing blank line from the block (we add our own
            # spacing in the consolidated block) so we don't accumulate
            # extra blank lines around the breadcrumb.
            extracted[sect].append(
                f"    /* (from original location, lines {i}-{end}.) */\n"
            )
            extracted[sect].extend(block)
            extracted[sect].append("\n")
            out.append(breadcrumb(sect))
            i = end + 1
            continue

        out.append(raw[i - 1])

        if i in insert_after_map:
            sect = insert_after_map[i]
            cfg = PLAN[sect]
            out.extend(line + "\n" for line in cfg["header"])
            out.extend(extracted[sect])
            out.extend(line + "\n" for line in cfg["footer"])

        i += 1

    SRC.write_text("".join(out))
    new_n = len(out)
    print(f"OK: {n} -> {new_n} lines ({new_n - n:+d})")
    for sect in PLAN:
        moved = sum(
            1
            for ln in extracted[sect]
            if not ln.startswith("    /* (from original location")
        )
        print(f"  {sect}: {moved} lines lifted")


if __name__ == "__main__":
    main()
