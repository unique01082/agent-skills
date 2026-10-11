# Construction JSON and tools

The top-level object is keyed by a safe filename slug. Each record needs `name`, `p`, `q`, `idea`, and `elements`. Other metadata is preserved by the collection's manifest builder. Color values are six-digit hex strings.

```json
{
  "demo-return": {
    "name": "Demo Return",
    "p": "#267F97",
    "q": "#71BFC0",
    "idea": "An open returning contour around a quiet center",
    "elements": [
      {"tag": "path", "d": "M73 26C45 8 18 29 18 53C18 78 44 91 72 73", "fill": "none", "stroke": "P", "stroke-width": "8.5"},
      {"tag": "circle", "cx": "53", "cy": "50", "r": "11", "fill": "P"}
    ]
  }
}
```

Supported elements are SVG paths, circles and ellipses. A `stroke` value is a construction marker; `stroke-width` controls the expanded geometry. A filled path uses `fill: P`. Add `data-op: cut` for a transparent subtraction. Transforms support one `rotate(angle cx cy)` or `translate(x y)`; pre-transform more complex geometry yourself.

The example demonstrates the schema, not a ready-to-use brand identity. Draw each new product's actual metaphor.

## Important Boolean ordering

All positive shapes are unioned before cuts. A large disk cut will erase every internal line crossing that disk, even if a line appears later in the source array. Use an expanded circle stroke plus positive internal lines for a globe; do not use a filled disk minus a smaller disk after those lines.

Overlapping source contours are normal. The final deliverable is a true unioned area, not an SVG layer stack. Isolated specks, narrow fragments or filled counters after smoothing require a design fix.

## Output and checks

`compile.cjs` creates `<key>.svg`, `<key>-mono.svg`, and `geometry-audit.json` in the output directory. Metadata does not create gallery entries automatically. It refuses to overwrite existing files by default; failed generation can leave partial output, so use a staging directory before replacing existing artwork.

`audit.py ICON_DIR --manifest MANIFEST.json` scopes checks to the selected keys. Without a manifest it checks all SVG pairs in that directory. The audit expects the compiler's closed cubic output. It does not support arbitrary SVG imports or prove that an image is aesthetically strong. Keep its report separate from the compiler's geometry report.

`board.py MANIFEST.json ICON_DIR BOARD.svg` builds a contact sheet from exact deliverable paths, including color, mono, and actual-size samples. Use `--columns N`, `--title TITLE` or `--dark` as needed. Gradient IDs are made unique across clones. `render.cjs BOARD.svg BOARD.png` exports a PNG for visual inspection; `render.cjs ICON_DIR --sizes` smoke-renders every SVG at 16, 24, 32 and 128 px.

For the current repository, `python3 docs/brand/logo-system-v4/build-reserve.py` regenerates construction metadata only. Re-running it does not redraw the final SVGs. Modify that source builder along with metadata when changing a reserve concept.
