---
name: lightmesh-connect
description: >
  Connects an AI client to LightMesh and proves the connection works — remote MCP server for Claude Code,
  claude.ai / Claude desktop, ChatGPT, Codex, Antigravity or any MCP client, and WebMCP for an AI running
  inside the browser page. Use whenever someone wants to add, configure, authenticate, debug or verify a
  LightMesh MCP connection; asks for the LightMesh MCP URL, client ID or OAuth settings; sees 401s, a login
  that never returns, "no tools", or WebMCP reported as unavailable; or wants to confirm that AI edits show
  up live on the canvas. Also use for local development against http://localhost:3002/mcp.
---

# Connect an AI client to LightMesh

LightMesh exposes one tool catalog through two routes. Pick the route from where the AI runs, not from
which AI it is:

| The AI runs…                                                      | Route          | Setup                     |
| ----------------------------------------------------------------- | -------------- | ------------------------- |
| In a terminal, a chat website, or a desktop app not showing LightMesh | **Remote MCP** | URL + OAuth sign-in       |
| Inside the browser page that has LightMesh open (Codex desktop)   | **WebMCP**     | None — the page publishes |

Both routes reach the same registry on the server, so tool names, arguments and answers are identical.
The only difference: WebMCP also knows the open graph and the user's selection (via `session_context`).

## Connection facts

```text
Endpoint     https://lightmesh.baole.space/mcp          (local dev: http://localhost:3002/mcp)
Transport    Streamable HTTP, stateless — every request carries its own bearer token
Auth         OAuth 2.1 Authorization Code + PKCE, delegated to Authentik
Issuer       https://id.baole.space/application/o/light-mesh/
Client ID    yRssBzIocQyH1qsb3P9qwV6Eh4wynJIkfloOgjho   (public client, no secret)
Discovery    GET /.well-known/oauth-protected-resource   (RFC 9728)
```

Two things trip people up, so say them up front:

- `mcp.lightmesh.baole.space` appears in older notes but does not answer. Use `lightmesh.baole.space/mcp`.
- Authentik has **no dynamic client registration**. A client that only knows how to self-register will
  fail at login; it must be given the client ID above. That is the whole reason some clients work and
  others do not yet.

## Per-client setup

**Claude Code**

```bash
claude mcp add --transport http lightmesh https://lightmesh.baole.space/mcp \
  --client-id yRssBzIocQyH1qsb3P9qwV6Eh4wynJIkfloOgjho --callback-port 8765
```

Then `/mcp` → `lightmesh` → Authenticate. The redirect is `http://localhost:8765/callback`, which the
Authentik provider must allow. `--scope project` shares the entry through `.mcp.json`; each person still
signs in as themselves.

**claude.ai / Claude desktop** — Settings → Connectors → Add custom connector → URL above → Advanced
settings → OAuth Client ID = the client ID, secret empty → Connect. Needs
`https://claude.ai/api/mcp/auth_callback` on the Authentik provider.

**ChatGPT** — Settings → Apps & Connectors → Advanced → Developer mode → Create → URL above → OAuth →
supply the client ID. Needs ChatGPT's callback URL on the Authentik provider.

**Codex CLI** (verified flags on codex-cli 0.146)

```bash
codex mcp add lightmesh --url https://lightmesh.baole.space/mcp \
  --oauth-client-id yRssBzIocQyH1qsb3P9qwV6Eh4wynJIkfloOgjho
codex mcp login lightmesh
```

Pin the callback port so it can be allow-listed: `mcp_oauth_callback_port = 8765` at the top level of
`~/.codex/config.toml` (redirect `http://localhost:8765/callback`, same as Claude Code). Check with
`codex mcp list` / `codex mcp get lightmesh`. Older Codex builds without `--oauth-client-id` cannot log in
to Authentik; upgrade rather than fall back.

**Codex desktop app** — WebMCP (below), no configuration.

**Antigravity and other clients** — if the client has a field for a fixed OAuth client ID, use the
facts above. If it can only self-register (dynamic client registration) or only accepts a pasted token,
it cannot authenticate to LightMesh today; say so plainly and suggest Claude Code, Codex or claude.ai
rather than handing over a config that fails at login. (For local testing only, a token from a signed-in
browser session works as `Authorization: Bearer …`; it expires within minutes to hours.)

Check a client's real options (`<cli> mcp add --help`) before declaring it unsupported — CLIs gain OAuth
flags quickly, and a stale "not supported" costs the user a working setup.

Menu names in third-party apps drift. If a path above no longer matches, describe the intent ("add a
custom MCP connector with OAuth and a fixed client ID") and let the user find it.

## WebMCP

Nothing to install. When the page runs in a browser exposing `document.modelContext` (Codex desktop) or
`navigator.modelContext`, LightMesh registers every tool as soon as the user is signed in. Elsewhere it is
a no-op. Check it in the app: pug → assistant header → **operations console** → the WebMCP line reads
`N tools published to this page`, `not available in this browser`, or an error (usually a lapsed session —
reload and sign in).

Around each WebMCP call the page pushes the user's unsaved local edits before a write and pulls the result
afterwards, so the AI reads what the user sees and the user sees the AI's write immediately.

## Verify the connection end to end

Do not report "connected" on the strength of a config file. Prove it:

1. `tools/list` returns ~36 tools including `session_context`, `graph_list`, `graph_import`
   (`node_generate_avatar` is present only when the deployment has an image model).
2. `graph_list` answers `status: "success"` — auth resolved to a real user.
3. Optional live check: with the graph open in the browser, `node_create` a throwaway node and watch it
   appear without a reload (typically well under a second — the server notifies every collaboration
   socket on that graph after persisting), then `node_delete` it.

A raw probe, useful when a client's own UI is opaque:

```bash
curl -si -X POST https://lightmesh.baole.space/mcp -H 'content-type: application/json' -d '{}' | head -5
```

`401` with `www-authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource"` means the
server is up and discovery is published — any remaining failure is on the OAuth side.

## Troubleshooting

| Symptom                                   | Likely cause                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| Timeout / connection refused              | Wrong host (`mcp.` subdomain) or local server not running (`docker compose up -d server`) |
| Login page 404 or "invalid client"        | Client tried dynamic registration — give it the client ID                     |
| Login succeeds, never returns             | Client's redirect URI not allowed on the Authentik provider                  |
| `401` after login                         | Token audience is not the client ID, or issuer mismatch                      |
| Tools listed, every call `not_found`      | `graphId` belongs to another user or is mistyped — call `graph_list`         |
| `429`                                     | 120 requests/minute per account; batch writes with `graph_apply_patch`       |
| Edits land but canvas does not move       | Page is not on that graph, or its socket dropped — status bar should say "Live" |

For locally built servers, check the container actually runs current code (`docker inspect … --format
'{{.Created}}'` against the last commit) before debugging behaviour.

Once connected, use the **lightmesh-agent** skill for how to work with the tools.
