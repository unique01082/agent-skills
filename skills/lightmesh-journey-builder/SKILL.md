---
name: lightmesh-journey-builder
description: >
  Designs and writes LightMesh Journeys — ordered presentation routes through a graph where each step
  spotlights a group of nodes with a title and narration — for demos, onboarding, architecture reviews,
  lessons and walkthroughs. Use whenever the user wants to present, tell the story of, walk someone
  through, tour, onboard people to, or build slides/a talk track from a LightMesh graph; mentions a
  journey, presentation, walkthrough or narration; or wants an existing journey reordered, tightened or
  updated after the graph changed. Works live via journey_* tools or inside a .lightmesh.json file.
---

# Build a LightMesh Journey

A Journey is stored on the graph (`graph.journey`) and travels with it:

```json
{ "title": "How a checkout gets paid", "description": "10-minute tour for new engineers",
  "steps": [ { "id": "overview", "title": "The whole flow", "narration": "…", "nodeIds": [] } ] }
```

Each step highlights its `nodeIds` together in **Present** mode; `nodeIds: []` shows the whole graph and
is the intended overview. It is a view over the graph — it adds no nodes and changes none.

## Start from the audience, not the node list

Before writing steps, settle three things (ask if the request does not make them obvious):

1. **Who** is watching — new hire, executive, student, reviewer.
2. **What they should be able to say afterwards**, in one sentence. That sentence becomes the journey
   `description` and decides what gets cut.
3. **How long** — roughly one step per minute; 5–9 steps suits most talks. More than ~12 means the story
   has two journeys in it, or steps are too granular.

Then read the graph (`graph_get` small / `graph_subgraph` + `graph_contexts` large) and pick the path
that proves the sentence. Nodes that do not serve it stay out of the journey — they remain in the graph.

## Story shape that works

1. **Overview** (`nodeIds: []`) — the whole map, and the question the tour answers.
2. **Entry point** — where it starts for the audience (the user action, the API, the first lesson).
3. **The main path**, 2–5 steps, each one hop or one cluster further along real edges.
4. **The interesting part** — failure path, trade-off, prerequisite gap, the reason the talk exists.
5. **Wrap-up** — the handful of nodes to remember, or back to the overview with the takeaway.

Rules of thumb, with the reason:

- **2–6 nodes per step.** One node is a slide about a box; ten is the whole graph again. Group what
  answers one question together.
- **Consecutive steps should share or neighbour nodes.** The camera moves along edges the audience can
  see; jumping across the graph loses them. Use `graph_path` between two stops to find the bridge nodes.
- **Title = the point, not the label.** "Payments fail safely" beats "PSP Adapter".
- **Narration: 1–3 sentences, audience-facing,** what to notice and why it matters, using node names
  exactly as they appear so viewers can find them. It doubles as speaker notes.
- **Stable step ids** (`overview`, `entry`, `authorise`, `failure-path`) so later edits target a step
  instead of rewriting the whole route.

## Writing it

**Live (tools connected)**

- New or wholesale rewrite: `journey_get` (to see what exists and not destroy it unasked), then
  **`journey_set`** with the full journey — atomic, and any unknown node id or duplicate step id changes
  nothing.
- Edit one stop: **`journey_step_upsert`** `{ step, index? }` (same id replaces; `index` moves it;
  omitted appends). Remove: **`journey_step_remove`** `{ id }`.
- Every `nodeIds` entry must be a real node id — verify with `node_get` / `graph_search` rather than
  deriving ids from names. If the story needs a node that does not exist, create it first (or tell the
  user) — do not point at a phantom.

**In a file** — put the object under `graph.journey`, then run the lightmesh-graph-builder checker (it
is installed beside this skill, e.g. `~/.agents/skills/lightmesh-graph-builder/`), which catches unknown
node ids and duplicate step ids:

```bash
node <skills-dir>/lightmesh-graph-builder/scripts/check_graph.mjs my-graph.lightmesh.json
```

A graph can hold one journey. If the user wants a second audience's version, confirm before replacing,
or offer to put the alternative in the reply for them to swap in.

## Keeping a journey healthy

When nodes are deleted, LightMesh strips their ids from steps automatically, which can leave a step
empty (and an empty step now reads as "overview"). After restructuring a graph, `journey_get` and check
each step still shows what its title claims; fix with `journey_step_upsert`.

## Worked example

Audience: new backend engineers. Sentence: "A checkout either settles or fails safely, and you know where
each happens." Six steps:

| id             | title                          | nodeIds                                      |
| -------------- | ------------------------------ | -------------------------------------------- |
| `overview`     | One payment, end to end        | `[]`                                         |
| `entry`        | It starts at the Checkout API  | `checkout-api`, `orders-db`                  |
| `authorise`    | The PSP decides                | `checkout-api`, `psp-adapter`                |
| `success`      | Success is an event            | `psp-adapter`, `payment-authorised`, `ledger` |
| `failure-path` | Failure is handled, not lost   | `psp-adapter`, `payment-failed`, `retry-queue` |
| `remember`     | Three places to look first     | `checkout-api`, `psp-adapter`, `ledger`      |

Narration for `failure-path`: "When the provider declines or times out, PSP Adapter retries three times,
then emits PaymentFailed onto the retry queue. Nothing is dropped silently — this is the step to remember
on call."

Reply to the user with the step list, how to play it (**Journey → Present** in the toolbar), and any node
you wished existed but left out.
