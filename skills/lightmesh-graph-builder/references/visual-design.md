# Designing a graph that looks good and gets used

How LightMesh actually draws a graph, and what that means for the choices you make. Everything here is
derived from the renderer (`apps/web/src/lib/graph/typeStyles.ts`, `palette.ts`, the Sigma 2D / 3D force /
Cosmos views). Run `scripts/review_graph.mjs` to check a graph against it.

## Contents
1. How the canvas draws you
2. Types, icons and colours
3. Names and labels
4. Structure that lays out well
5. Making it useful, not just pretty
6. The design pass (checklist)

## 1. How the canvas draws you

| Renderer fact                                                   | Consequence for the author                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------ |
| Dark background (`#151922`)                                     | Light, saturated pastels read best; dark colours vanish.      |
| Node = coloured chip + type icon; size = base + √degree         | Hubs get big. One node linked to everything dwarfs the rest.  |
| Node name drawn **in full** under the chip — no truncation      | Long names overlap neighbours and turn the canvas into text.  |
| Edge label drawn on the line; edge colour = its source's colour | Edge labels must be short; direction shows by colour gradient. |
| Force-directed layout (ForceAtlas2 in 2D, d3-force in 3D)        | Structure, not coordinates, decides the picture. You cannot place nodes; you can only give the layout good structure. |
| Default colour = hash of the type name into 12 colours          | Two types can land on the same colour by chance — check and set. |
| Default icon = type name lookup (exact, then substring)          | Recognised type names get a meaningful icon for free.         |
| `metadata.avatar` replaces icon + colour for that node          | Use for people, products, brands — sparingly.                 |

## 2. Types, icons and colours

**Aim for 4–8 node types**, each used by at least two nodes. A type classifies; if it only ever holds one
node it is a name, and the legend fills with noise. Merge synonyms (`service`/`microservice`/`svc`).

**Prefer type names the app already recognises** — they get a fitting icon with zero styling:

```text
code      service server app worker agent job process container function method class module package
          component hook interface type file repo library script
data      database db table schema model entity field cache queue topic stream
surface   api endpoint route page ui view event
work      task milestone release incident bug test experiment workflow step pipeline deployment
knowledge concept idea insight note definition requirement decision question lesson doc document spec
          example artifact reference
people    person user team org organization company role project
infra     domain cluster network host secret policy config tool metric
```

Substring hints also apply (`auth-service` → server, `user-repository` → database, `*-handler` → zap).
A type matching nothing renders as a generic dot — set `typeStyles.<type>.icon` for it.

**Icons must come from the app's catalog.** An unknown name silently falls back to the default. The full
catalog (lucide names, kebab-case):

```text
activity alert-triangle anchor apple atom award backpack balloon bell bike binary blocks book book-open
bookmark bot box boxes braces brain briefcase bug building-2 calendar camera car chart-pie check cherry
circle-dot circle-help clipboard clock cloud code coffee cog columns-3 compass component container cpu
crown database diamond dna download earth eye feather file file-code file-text filter fingerprint fish
flag flask-conical flower folder git-branch git-fork globe graduation-cap guitar hammer hard-drive hash
headphones heart hexagon house image import inbox key landmark languages layers layout leaf library
lightbulb link list lock magnet mail map map-pin medal megaphone message-square microscope milestone
monitor moon mountain music network newspaper notebook origami package palette paw-print pencil plane
play plug puzzle radio rocket route ruler scale school scissors server settings shapes share-2
shield shopping-bag signal smile snowflake sparkles split square square-function star sticky-note sun
table tag target telescope terminal test-tube timer toggle-left triangle trophy truck type upload user
users variable wallet wand-2 waves webhook workflow wrench zap
```

Not in the catalog (common mistakes): `archive`, `list-ordered`, `clipboard-check`, `shield-check`,
`user-circle`, `server-cog`, `database-zap`, `cloud-cog`, `key-round`, `lock-keyhole`.

**Colour by meaning, not at random.** Give related types neighbouring hues so the canvas groups itself:

| Family              | Suggested colours (all readable on the dark canvas)          |
| ------------------- | ------------------------------------------------------------ |
| Compute / services  | `#a78bfa` violet, `#c4b5fd` lavender, `#7774eb` indigo        |
| Data / storage      | `#34d399` emerald, `#5eead4` teal, `#86efac` green            |
| Interfaces / APIs   | `#7dd3fc` sky, `#67e8f9` cyan, `#93c5fd` blue                 |
| Events / async      | `#fcd34d` amber, `#fdba74` orange                             |
| People / org        | `#f9a8d4` pink, `#cf7de0` orchid                              |
| Risk / external     | `#fca5a5` red, `#fb7185` rose, `#cbd5e1` silver (external)    |
| Knowledge / docs    | `#fff4d6` ivory, `#c9aa79` sand, `#a3e635` lime               |

Rules: every type a distinct colour; reserve red for things that mean risk (incident, bug, external
dependency that can fail); keep external/third-party systems neutral (silver/slate) so *your* system is
what pops. Only style types you have a reason to — a style equal to the default is dropped anyway.

## 3. Names and labels

- **Node names ≤ ~24 characters**, noun phrases a person would say: `Checkout API`, `Orders DB`,
  `createTask()`, `BR-042`. Put the qualifier in `properties.description`, not in parentheses in the name.
  `Clients (web app, MCP clients, browser WebMCP)` → name `Clients`, description lists them.
- **Unique names.** Two `Handler` nodes are indistinguishable on the canvas and in search.
- Consistent casing per type: code identifiers as written (`createTask()`), everything else Title Case.
- **Edge labels 1–3 words**, verb-first: `calls`, `reads`, `emits on success`, `owned by`. The sentence
  lives in `properties.description` if it needs explaining.
- **A small edge vocabulary: ~4–8 edge types**, each used several times. The edge-type filter is a
  legend; 13 verbs used once each turn it into a word list. Keep the verb set coarse (`calls`, `reads`,
  `writes`, `emits`, `leads-to`) and put the nuance in the label (`type: leads-to`, `label: "fuels"`).
- Avoid `related-to`, `has`, `uses`, `connects` — they draw a line that says nothing. If you cannot name
  the relationship, question whether the edge belongs.

## 4. Structure that lays out well

A force layout makes a beautiful picture from a graph with **clear clusters joined by a few bridges**,
and a mess from anything else.

- **No star.** "Everything `part-of` System" puts one giant hub in the middle and a ring of nodes around
  it. Connect things to what they actually interact with, and use contexts for grouping.
- **No category hubs.** Nodes like `Causes`, `Backend`, `Key Events` that exist only to `part-of`
  their neighbours draw as several small stars and add nothing a reader can learn. Express the grouping
  as `metadata.contexts` (the reader toggles it) and spend edges on real relationships — *this cause
  fuelled that event*. Keep a grouping node only when it is a real thing (a team, a deployable service).
- **Average degree ~1.5–4.** Below that, islands; above, a hairball. Delete edges that are implied by
  others (A→B→C does not also need A→C unless A really talks to C).
- **No orphans** unless the point is that something is unconnected — and then say so in its description.
- **One edge per relationship.** No duplicate or mirrored edges of the same type; pick the true direction.
- **Hierarchies are fine, not the goal.** A pure tree lays out as a fan; the value of a graph is the
  cross-links (the service two teams share, the requirement three components implement). Make sure the
  interesting cross-links exist.
- **Size to one screen:** 12–40 nodes reads well; past ~60, split detail into branches the reader can
  expand, or use contexts so each view stays small.

## 5. Making it useful, not just pretty

A graph is useful when a reader can answer a question from it without asking the author.

- **Start from the question** and write it into `graph.description` ("Where can a checkout fail, and who
  owns each failure?"). Cut nodes that do not help answer it.
- **Every node gets a real description** (one sentence of *what it does / why it matters*, ≥ 12 chars).
  It fills the Inspector and makes search work by meaning.
- **Filterable facts in `properties`**: `owner`, `status`, `layer`, `language`, `criticality`, `sla`,
  `version` — scalar values, consistent keys across nodes of a type. These power the property filter.
- **Evidence in `data`**: a `vscode://file/<abs>:<line>` link on every code node, a diagram or doc on
  the key ones, an `insight` where you learned something non-obvious (why two things are coupled, a known
  risk). Readers trust a graph they can click through to the source.
- **Contexts for stories**: 2–5 tags like `Happy Path`, `Failure Handling`, `Auth`, `v2 migration` on
  nodes *and* edges, so one graph serves several conversations. Leave shared infrastructure untagged.
- **A journey** when the graph will be explained to others (lightmesh-journey-builder).

## 6. The design pass (checklist)

Run after the content is right, before hand-off:

1. `node scripts/review_graph.mjs <file>` (live: `graph_get` → save JSON → run it). Aim for ≥ 85; fix
   every `FIX`.
2. Types: 4–8, each ≥ 2 nodes, recognised names or explicit catalog icons, all distinct colours.
3. Names ≤ 24 chars and unique; edge labels ≤ 3 words; no vague edge types.
4. Structure: no star hub or category hubs, 4–8 edge types, no stray orphans, avg degree 1.5–4, no duplicate/mirror edges.
5. Usefulness: `graph.description` states the question; ≥ 90% nodes described; key facts as properties;
   source links with line numbers; contexts if > 25 nodes.
6. Tell the user the score and anything you deliberately left (e.g. an intentional orphan).
