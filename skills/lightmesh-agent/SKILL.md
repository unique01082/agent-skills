---
name: lightmesh-agent
description: >
  How to work inside LightMesh through its MCP/WebMCP tools — reading, searching and editing graphs,
  nodes, edges, insights, attachments, avatars and journeys safely and efficiently. Use whenever LightMesh
  tools (session_context, graph_list, graph_get, graph_apply_patch, node_create, insight_add, …) are
  available or the user asks an AI to explore, explain, update, extend, clean up, annotate or document a
  LightMesh graph; says "this node", "the selected edge", "add this to my graph", "record what you found";
  or wants a codebase, requirement or topic written into a live graph rather than a file. Pair with
  lightmesh-graph-builder for modeling choices and lightmesh-journey-builder for presentations.
---

# Working in LightMesh through tools

LightMesh is a graph of **nodes** (things) and **edges** (named relationships) with attached **data**
(text, images, files, links, insights). Every tool answers `{ status, data | message, details? }` where
`status` ∈ `success | validation_error | conflict | not_found | failure`. The full catalog with arguments
is in [references/tools.md](references/tools.md) — read it when you need an exact argument shape.

The user may be watching the canvas while you work: every persisted write appears on their screen within a
fraction of a second. Act like someone editing a shared document in front of its owner.

## 1. Orient before you touch anything

1. **`session_context`** first. Inside the browser (WebMCP) it returns the open graph and the selected
   node/edge as full records — this is how "this node" resolves. Over remote MCP it returns no graph and
   no selection; then call **`graph_list`** and pick by name, or ask.
2. Learn the graph's vocabulary before adding to it: `graph_filter` with no args (or `graph_get` on a small
   graph) shows node/edge types in use; `graph_contexts` lists context tags. Reuse them — a new
   `microservice` type beside an existing `service` silently splits every filter in two.
3. Read the region you will change: `graph_subgraph` (`direction: "out"` for a node's own branch),
   `graph_search` for a phrase, `graph_filter` for a field, `node_edges` when direction matters.

Prefer targeted reads over `graph_get` on anything past ~100 nodes; it returns the entire file.

`graphId` is optional on every graph-scoped tool: omitted, it means the session's graph (WebMCP context).
Over remote MCP pass it explicitly on every call — there is no ambient graph.

## 2. Choose the right write

| Intent                                                   | Tool                              |
| -------------------------------------------------------- | --------------------------------- |
| One small change                                         | `node_*` / `edge_*` CRUD          |
| Several related changes (a branch, a refactor)           | **`graph_apply_patch`** — ordered, all-or-nothing |
| "Expand this node" / sync one region to a described state | **`graph_upsert_subgraph`** (`attachWith`, `prune`) |
| A brand-new graph, or applying a whole generated file    | `graph_import` (`merge` default, `replace` wipes) |
| Record a finding for the next reader                     | `insight_add` / `insight_update`  |
| Point at source code                                     | `graph_add_source_attachment` (give `line`) |
| Attach text/image/file/link                              | `data_add` (upload bytes first with `file_upload`) |
| Rename, restyle, describe the graph                      | `graph_set_info`                  |
| Presentation route                                       | `journey_*` — see lightmesh-journey-builder |

Why batch: N separate calls can fail at call seven and leave a half-built branch on the user's screen; a
patch either lands whole or changes nothing and tells you which index failed. It also costs one request
against the 120/minute budget instead of N. Give every `createNode` in a patch an explicit `id` so later
`createEdge` entries can reference it.

`graph_import` with `replace` deletes everything not in the file — use it only for a graph you just
created or when the user asked to start over. `merge` overwrites by id and deletes nothing, so it cannot
remove stale nodes; use `graph_upsert_subgraph` with `prune` for that.

## 3. Write well

- **Stable, readable ids** you could re-derive next week (`auth-service`, `e-auth-calls-db`). Never
  random ids when you might touch the element again — the next edit finds it by id, and a re-minted id
  forks the graph silently.
- **Edges read as sentences**: `source --type--> target` must be a true statement. Swap endpoints rather
  than inventing a passive type.
- **`properties`** hold searchable scalar facts (`description` especially — `graph_validate` flags nodes
  without one). **`metadata`** holds bookkeeping (`contexts: string[]`, `avatar`). Anything non-scalar is
  a `data` item.
- `properties`/`metadata` on updates are **merge-patched**: send only changed keys; `null` removes a key.
  `node_update` never touches `data`.
- Names are what people read on the canvas: short and specific (`createTask()`, `BR-042`, `Postgres`).
- After a batch, run `graph_validate` (or pass `validate: true` to the batch tool). Only `severity:
  "error"` is certainly wrong; orphans and cycles may be intentional — mention, do not "fix" blindly.
- After building or reshaping a sizeable region, do a **design pass**: `graph_get`, save the result to a
  JSON file, run lightmesh-graph-builder's `scripts/review_graph.mjs` on it, and fix what it flags — colour
  clashes, icons outside the app's catalog, names too long for the canvas, star hubs, vague edge types,
  missing descriptions. The user is looking at the picture, not the JSON.

Modeling depth, sizing and type choices: **lightmesh-graph-builder**.

## 4. Be careful with destructive tools

`node_delete` cascades to every attached edge and is not undoable; `data_remove` is not undoable;
`graph_import replace` and `prune: true` can delete whole regions. Before any of these:

- Name exactly what will go (`node_delete` of `db` also removes `e-api-reads-db`, `e-worker-writes-db`).
- Get explicit confirmation unless the user already asked for that precise deletion.
- Never resolve "delete this" from a guess — call `session_context` and act on the returned id.

If `session_context.staleSelection` is non-empty, the selected element no longer exists; say so.

## 5. Handle results honestly

| Status             | What to do                                                                |
| ------------------ | ------------------------------------------------------------------------- |
| `validation_error` | Read `message`/`details`, fix the arguments, retry once. Do not loop.     |
| `not_found`        | Wrong id or graph. Re-read (`graph_search`, `graph_list`) instead of guessing. |
| `conflict`         | Someone (often the user) changed the graph mid-call, or the id is taken. Re-read, then redo. |
| `failure`          | Report it. A write-scope refusal ("this conversation is about graph X") means act on the open graph or ask the user to open the other one. |

Report what actually changed — counts and names from the returned diff — not what you intended.

## Limits worth knowing

2,000 nodes and 5,000 edges per graph · 50 graphs per user · 10 MB per graph snapshot · inline base64
≤ 2 MB · `file_upload` ≤ 10 MB (no HTML/SVG/scripts) · avatars PNG/JPEG/WebP/GIF ≤ 2 MB, no SVG ·
120 requests/minute per account. `node_generate_avatar` exists only on deployments with an image model;
describe the picture ("flat teal padlock icon"), not the node.

## Worked micro-example

User (WebMCP, a node selected): "Add the three things this service depends on and note why."

1. `session_context` → `selectedNode: { id: "checkout-api", type: "service", … }`
2. `graph_filter {}` → types in use: `service`, `database`, `queue`; edge types `calls`, `reads`.
3. `graph_apply_patch` with `validate: true`:
   `createNode` `orders-db` (database), `createNode` `payments-queue` (queue), `createNode` `psp-adapter`
   (service), then three `createEdge` from `checkout-api` using `reads` / `publishes-to` / `calls`.
4. `insight_add` on `checkout-api`: why each dependency exists, citing the code you read.
5. Reply: "Added 3 nodes and 3 edges from Checkout API; validation clean. Insight attached."
