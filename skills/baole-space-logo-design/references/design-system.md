# Fluid — Silk design reference

## Current workspace

The current local collection lives in `/Users/baole/Documents/GitHub/baole.space`:

- `public/icons/v4/<key>.svg`, `<key>-mono.svg`: current deliverables.
- `docs/brand/logo-system-v4/manifest.json`: live identity metadata; inspect rather than hardcoding a count.
- `source-constructions.json`: editable shapes before expansion/union.
- `reserve-constructions.json`, `reserve-manifest.json`: hypothetical Light* concepts.
- `build-gallery.py`, `gallery.css`, `gallery.js`: editable offline gallery sources.

These paths are defaults for this machine. Use the user's supplied checkout elsewhere. Root-level `public/icons/*.svg` and older `v2`/`v3` folders are separate versions; a V4 request does not authorize overwriting them.

## Established visual treatment

- Square `viewBox="0 0 100 100"`, transparent background, usually roughly 12–88 optical bounds. Preserve expressive tips when necessary; margins are optical, not a rigid box.
- Principal strokes around 7.5–9 units during construction; secondary lines around 6–7.5. Avoid hairlines after Boolean operations.
- One filled compound path, expanded and unioned, with transparent holes. Multiple disconnected contours are fine when they serve the mark.
- Color: one restrained two-stop gradient, diagonal from `(12,18)` to `(82,87)` with `gradientUnits="userSpaceOnUse"`. Monochrome uses `#272633`; previews on dark backgrounds can use light ink.
- No raster embedding, font dependency, drop shadows, filters, masks or overlapping translucent shapes in the icon deliverable.
- Separate the brand mark from its wordmark. Names on a presentation board may use system fonts; the standalone icon has no live text other than accessible title/description.

## Reference decisions

At the time of this skill's creation, the user approved Admin, accepted the latest six-mark redraw as the direction, and requested 24 reserve marks. These are historical design references, not a permanent prohibition on future changes.

- LightRead: open book, two broad page counters and shared spine; teal `#008D82 → #48C6AB`.
- LightNote: folded page and one handwriting return; amber `#D76A22 → #F2B544`.
- LightKitchen: bowl, joined spoon and one steam fold; warm `#E46D32 → #EAB640`.
- TheMany: five connected loops and an open shared center; `#5854CE → #28B5AD`.
- AI Gateway: two open wings and one soft central facet; `#7457C0 → #AF9BDD`.
- Admin: two interlaced perpendicular command loops; `#65618A → #AF9BC5`.
- Milu: faithful three-quarter dog face, folded ear, domed dark mask, light face and short smiling muzzle; warm `#C87B3F → #EFBC7A`. Inspect the original app asset when fidelity matters, rather than replacing it with a generic mascot.

Open the live gallery or render selected reference SVGs when evaluating proportions. Do not copy their geometry into a supposedly distinct new identity. New marks can use another silhouette while sharing smooth contours and restrained color.
