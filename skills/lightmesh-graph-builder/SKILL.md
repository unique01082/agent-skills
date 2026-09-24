---
name: lightmesh-graph-builder
description: >
  Models a system, codebase, architecture, requirement, process, course or body of knowledge as a
  LightMesh graph of nodes and edges — choosing entities, ids, types, edge directions, contexts, type
  styles and attachments — and delivers it either live through the LightMesh MCP/WebMCP tools or as an
  importable `.lightmesh.json` file. Use whenever the user wants to map, graph, diagram or visualise how
  something fits together; asks for a knowledge graph, concept map, dependency map or LightMesh file;
  wants requirements traced to source code; or wants an existing graph extended, restructured or patched.
  Reach for it even when the user never says "LightMesh" if the output should be nodes and edges.
---

# Build a LightMesh graph

A good graph answers a question someone actually has ("what breaks if the PSP is down?", "what must a
student know before eigenvalues?"). Every modeling choice below serves that: fewer, truer nodes and
relationships that read as sentences.

## Pick the delivery path first

| Situation                                              | Deliver via                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| LightMesh tools are connected (MCP/WebMCP)             | **Live**: `graph_import` for a new graph, `graph_apply_patch` / `graph_upsert_subgraph` to extend. See lightmesh-agent. |
| No connection, or user wants a file to review/commit   | **File**: `<graph-id>.lightmesh.json`, checked with `scripts/check_graph.mjs`, imported via *Graph files and samples → Import graph file* (Replace or Merge). |

Live is better when available: the user watches the graph appear, the server validates every write, and
attachments can go to object storage (`file_upload`) instead of bloating the file. For a large new graph,
build it in one `graph_import` (or a few `graph_apply_patch` batches by region) rather than hundreds of
single calls.

## Procedure

1. **Read the real source first.** For code, open entry points, routes, modules, schemas; for documents,
   pull out the terms they define. A graph invented from the request describes a generic system, not
   *this* one. Note file paths and line numbers as you go — they become source attachments.
2. **When extending, read the graph first** (`graph_filter {}`, `graph_contexts`, `graph_subgraph`) and
   reuse its node types, edge types, id style and contexts.
3. **Entities → nodes.** Model what a person would point at while explaining the system. Give each a
   `type` (open vocabulary, lowercase-hyphenated: `service`, `database`, `api`, `event`, `requirement`,
   `concept`, `person`, `function`, `component`) and a short, specific `name`.
4. **Assign all ids before writing edges**, so edges reference ids you already committed to.
5. **Relationships → edges** with a semantic `type` (`calls`, `reads`, `writes`, `emits`, `depends-on`,
   `implements`, `part-of`, `prerequisite-of`, `owned-by`, `explains`) and a spoken `label`.
6. **Facts → `properties`** (always a one-sentence `description`; plus scalars worth filtering:
   `owner`, `language`, `status`, `sla`). **Bookkeeping → `metadata`** (`contexts`). **Rich content →
   `data`** (source links, diagrams, excerpts, insights).
7. **Stories → contexts.** Tag nodes *and* edges with `metadata.contexts` (`["Happy Path"]`,
   `["Failure Handling"]`) instead of splitting one system into several graphs. Untagged = always shown.
8. **Style the types** with `graph.typeStyles`: distinct colours grouped by meaning, icons **only from
   the app's catalog** (an unknown icon silently falls back — `archive` and `list-ordered` are not in it).
9. **Check correctness**: `graph_validate` live, or `node scripts/check_graph.mjs file.json` offline. Fix
   every error; judge warnings (an orphan may be a genuinely unconnected item — say so rather than
   inventing an edge).
10. **Design pass**: `node scripts/review_graph.mjs file.json` (live: `graph_get`, save the JSON, run it).
    It scores the graph as the renderer will draw it — colour clashes, invalid icons, long labels, star
    hubs, category hubs, sprawling edge vocabularies, orphans, vague edges, missing descriptions/evidence. Fix every `FIX`, aim for ≥ 85, and read
    [references/visual-design.md](references/visual-design.md) for the why behind each rule.
11. Optionally add a journey (lightmesh-journey-builder) if the graph will be presented.

## The rules that matter most

**Ids are the graph's API.** Stable, human-readable slugs derived from the entity: `checkout-api`,
`br-042`, `create-task-fn`; edges `e-<source>-<verb>-<target>`. Never random or sequential ids for things
you might touch again: merge and patch match on id, so a re-minted `payment-service-2` silently forks the
graph and no validator will notice.

**Edges are sentences.** `source --type--> target` must be true read left to right:
`checkout-api --calls--> psp-adapter`, `br-042 --implemented-by--> create-task-fn`. If it only reads
backwards, swap the endpoints. Direction is what readers trust and what is most often silently wrong.

**Size to the question.** 8–40 nodes for a first pass. A node per file mirrors the directory tree and
hides the flow; the edges that matter drown in edges that merely exist. Add depth where the user asks —
extending a branch later with `graph_upsert_subgraph` + `attachWith` is cheap. Hard limits: 2,000 nodes,
5,000 edges, 10 MB per graph.

**Draw for the canvas.** Names are drawn in full (keep them ≤ ~24 chars; detail goes in the
description), node size grows with degree (avoid one hub linked to everything — it makes a star, not a
map), edge labels sit on the line (1–3 words), and a type name the app recognises (`service`, `database`,
`api`, `event`, `person`, `requirement`, `concept`…) gets a fitting icon for free. Details and the icon
catalog: [references/visual-design.md](references/visual-design.md).

**One vocabulary.** Before coining a type, check whether an existing one fits. `service` vs
`microservice` vs `svc` in one graph breaks filtering and styling.

## Attachments

| `kind`    | Renders as                  | Source                                                   |
| --------- | --------------------------- | -------------------------------------------------------- |
| `link`    | link / deeplink             | `{ type: "uri", uri }` — `https://`, `vscode://file/…:line` |
| `image`   | inline picture              | `uri` (https), `object` (via `file_upload`), or small `inline.base64` |
| `file`    | download                    | `object` via `file_upload` (≤10 MB), or `uri`             |
| `text`    | preformatted note           | `{ type: "inline", text }` only — `uri` is ignored        |
| `insight` | AI-authored finding         | use `insight_add`                                         |

For source code, use `graph_add_source_attachment` live (absolute `path` + `line` + short `excerpt`) so
every source link has one shape and `graph_filter sourcePath` finds it. In a file, write the equivalent
`link` item with `vscode://file/<abs-path>:<line>`. Never base64 large binaries into a file — it caps at
2 MB per item and makes the graph unreadable in review.

## File format

Envelope with exactly four keys — `schema`, `graph`, `nodes`, `edges`; unknown top-level keys are
rejected. New files use `"schema": { "name": "lightmesh", "version": "1.1" }`. Full field reference, a
complete example, merge semantics and patch files: [references/file-format.md](references/file-format.md).

When applying a file live with `graph_import`, keep `file.graph.id` equal to the target `graphId`.

## Hand-off

Tell the user: what was built (node/edge counts, the main types, which contexts, the design score), where it lives (graph
id / URL `https://lightmesh.baole.space/graphs/<id>`, or file path + Replace/Merge), and any warning you
chose to leave. Offer the obvious next step (expand a branch, add a journey) in one line.
