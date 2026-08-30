---
name: lightread-lite
description: Save one local TXT, Markdown, HTML, MDX, JSX, Mermaid, or image document to LightRead through a same-machine browser handoff without requiring the LightRead MCP plugin.
---

# LightRead Lite

Use the bundled CLI to validate the document, create a static preview card, open LightRead, and keep the single-use loopback handoff alive.

## Workflow

1. Resolve an explicit title, supported kind, and absolute local file path. If the source exists only in the conversation, write it to a sensibly named workspace file only when the user's request authorizes creating that artifact.
2. Start the CLI in a terminal session that can remain alive:

   ```bash
   node scripts/send-to-lightread.mjs --path /absolute/path/document.md --title "Document title" --kind MARKDOWN
   ```

3. Parse the first JSON line. Render `previewPath` in the conversation with standard image Markdown so the user sees the static save card. The card is a preview, not an interactive button.
4. Keep the CLI session alive until it reports `consumed`, `expired`, or an error. Tell the user to finish authentication, permissions, and final import confirmation in the browser. Never request a LightRead password, access token, authorization code, or callback URL.
5. Report success only after `consumed`. This proves LightRead fetched the local document, not that the application completed its final import; treat final import confirmation as a browser-side user gate.

If the handoff expires, is consumed, or becomes unreachable, run the CLI again to create a fresh single-use URL. Never reuse an old tab or endpoint.

## Kind mapping

- `TXT`: `.txt`
- `MARKDOWN`: `.md`, `.markdown`
- `HTML`: `.html`
- `MDX`: `.mdx`
- `JSX`: `.jsx`
- `MERMAID`: `.mmd`, `.mermaid`
- `IMAGE`: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`, `.avif`

Use `--no-open` only for testing. `--import-base-url` and `--allowed-origin` are advanced overrides and must remain aligned.
