# LightMesh file format (schema 1.1)

## Contents
- Envelope and fields
- Complete example
- Import modes and patch files
- Type styles
- Common rejections

## Envelope and fields

```json
{ "schema": { "name": "lightmesh", "version": "1.1" },
  "graph":  { "id": "payments-flow", "name": "Payments Flow", "description": "…",
              "typeStyles": { … }, "journey": { … } },
  "nodes":  [ … ],
  "edges":  [ … ] }
```

| Field                       | Rule                                                                           |
| --------------------------- | ------------------------------------------------------------------------------ |
| `schema.version`            | `"1.0"` or `"1.1"` — not `"1.0.0"`. Use `1.1` for new files.                   |
| `graph.id`                  | Slug; reuse it when patching the same graph.                                    |
| `node.id`, `edge.id`        | Required, non-blank, unique within its list.                                   |
| `node.type`, `edge.type`    | Required, open vocabulary.                                                      |
| `node.name`                 | Required; what the canvas shows.                                                |
| `edge.source/target`        | Must name existing nodes, or the whole file is rejected.                        |
| `edge.label`                | Optional; defaults to `type`.                                                    |
| `properties`                | Searchable, filterable facts. Put `description` here.                           |
| `metadata`                  | Bookkeeping: `contexts: string[]`, `avatar` (set via tools, not by hand).       |
| `data`                      | Attachments: `{ id, kind, name?, mimeType?, source }`; `id` unique per element. |
| `graph.typeStyles`          | `{ "<node type>": { "icon": "<lucide-name>", "color": "#rrggbb" } }`            |
| `graph.journey`             | `{ title?, description?, steps: [{ id, title, nodeIds, narration? }] }`         |

Include `properties: {}` and `metadata: {}` on every node and edge even when empty — it keeps diffs
uniform and matches what the app exports.

## Complete example

```json
{
  "schema": { "name": "lightmesh", "version": "1.1" },
  "graph": {
    "id": "payments-flow",
    "name": "Payments Flow",
    "description": "How a checkout becomes a settled payment",
    "typeStyles": {
      "api": { "icon": "globe", "color": "#7dd3fc" },
      "service": { "icon": "server", "color": "#a78bfa" },
      "event": { "icon": "zap", "color": "#fbbf24" }
    }
  },
  "nodes": [
    { "id": "checkout-api", "type": "api", "name": "Checkout API",
      "properties": { "description": "Public endpoint that starts a payment", "owner": "payments" },
      "metadata": { "contexts": ["Happy Path"] },
      "data": [
        { "id": "src", "kind": "link", "name": "routes/checkout.ts:42",
          "source": { "type": "uri", "uri": "vscode://file/Users/me/repo/src/routes/checkout.ts:42" } }
      ] },
    { "id": "psp-adapter", "type": "service", "name": "PSP Adapter",
      "properties": { "description": "Wraps the payment provider API" },
      "metadata": { "contexts": ["Happy Path", "Failure Handling"] },
      "data": [
        { "id": "retry", "kind": "text", "name": "Retry behaviour",
          "source": { "type": "inline", "text": "Retries 3x with jitter, then emits PaymentFailed." } }
      ] },
    { "id": "payment-authorised", "type": "event", "name": "PaymentAuthorised",
      "properties": { "description": "Emitted once the provider approves the charge" },
      "metadata": { "contexts": ["Happy Path"] } },
    { "id": "payment-failed", "type": "event", "name": "PaymentFailed",
      "properties": { "description": "Emitted after retries are exhausted" },
      "metadata": { "contexts": ["Failure Handling"] } }
  ],
  "edges": [
    { "id": "e-checkout-calls-psp", "source": "checkout-api", "target": "psp-adapter", "type": "calls",
      "label": "calls to authorise", "properties": {}, "metadata": { "contexts": ["Happy Path"] } },
    { "id": "e-psp-emits-authorised", "source": "psp-adapter", "target": "payment-authorised",
      "type": "emits", "label": "emits on success", "properties": {}, "metadata": { "contexts": ["Happy Path"] } },
    { "id": "e-psp-emits-failed", "source": "psp-adapter", "target": "payment-failed",
      "type": "emits", "label": "emits after retries", "properties": {}, "metadata": { "contexts": ["Failure Handling"] } }
  ]
}
```

## Import modes and patch files

- **Replace** swaps the whole graph for the file.
- **Merge** adds elements with new ids and overwrites elements whose id already exists; it **deletes
  nothing**. A patch file is therefore just a normal file containing only the new/changed elements plus
  any existing nodes its edges point at (re-declared unchanged, or the edge endpoints will not resolve
  inside the file).

To remove elements, merge cannot help — use `graph_apply_patch` (`deleteNode`/`deleteEdge`) or
`graph_upsert_subgraph` with `prune: true` live, or tell the user which ones to delete by hand.

## Type styles

Only node types can be styled (edges take their colour from their source node). `icon` must be one of the
lucide names the app bundles (full list in [visual-design.md](visual-design.md)); anything else falls back
to the type's default without an error. `typeStyles` passed to `graph_set_info` **replaces** the whole map — read the
current one first and send the merged map.

Recognised type names already get these icons by default, so style them only to change the colour or
when your type name is not recognised. Useful pairs: `service`→`server`, `database`→`database`, `api`→`globe`, `queue`→`inbox`,
`event`→`zap`, `function`→`code`, `component`→`component`, `person`→`user`, `requirement`→`ruler`,
`concept`→`lightbulb`, `document`→`file-text`, `cache`→`hard-drive`.

## Common rejections

| Message                                        | Fix                                             |
| ---------------------------------------------- | ----------------------------------------------- |
| `schema.version must be one of: 1.0, 1.1`      | Use `"1.1"`                                     |
| unknown top-level key                          | Only `schema`, `graph`, `nodes`, `edges`         |
| edge endpoint missing                          | Add the node, or include it in the patch file   |
| `journey step "…" refers to unknown node`      | Journey `nodeIds` must exist in the same file   |
| inline base64 over 2 MB                        | Upload with `file_upload`, or link by https URI |
