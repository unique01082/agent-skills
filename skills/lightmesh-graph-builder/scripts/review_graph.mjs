#!/usr/bin/env node
// Design review for a LightMesh graph: does it look good and answer questions, as the app will draw it?
//   node review_graph.mjs graph.lightmesh.json [--repo /path/to/lightmesh] [--json]
// Complements check_graph.mjs (correctness). Reads the app's real icon catalog, default type→icon map and
// palette from apps/web/src/lib/graph/typeStyles.ts when the repo is found; otherwise uses the snapshot
// embedded below. Exit code is always 0 — this is advice, not a gate.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--repo'));
const asJson = args.includes('--json');
const repoArg = args.includes('--repo') ? args[args.indexOf('--repo') + 1] : null;
if (!file) {
  console.error('usage: review_graph.mjs <file.json> [--repo <lightmesh repo>] [--json]');
  process.exit(2);
}
const doc = JSON.parse(readFileSync(file, 'utf8'));

// ---- the app's drawing rules -------------------------------------------------------------------------
const SNAPSHOT_ICONS = 'apple award backpack balloon bike bookmark camera car chart-pie cherry circle-help clipboard coffee compass crown dna earth feather fingerprint fish flower graduation-cap guitar headphones house image landmark languages leaf magnet map-pin medal megaphone microscope moon mountain music newspaper notebook origami paw-print plane school scissors shopping-bag smile snowflake sun telescope trophy activity alert-triangle anchor atom bell binary blocks book book-open bot box boxes braces brain briefcase bug building-2 calendar check circle-dot clock cloud code cog columns-3 component container cpu database diamond download eye file file-code file-text filter flag flask-conical folder git-branch git-fork globe hammer hard-drive hash heart hexagon import inbox key layers layout library lightbulb link list lock mail map message-square milestone monitor network package palette pencil play plug puzzle radio rocket route ruler scale server settings shapes share-2 shield signal sparkles split square square-function star sticky-note table tag target terminal test-tube timer toggle-left triangle truck type upload user users variable wallet wand-2 waves webhook workflow wrench zap'.split(' ');
const SNAPSHOT_PALETTE = ['#7dd3fc', '#86efac', '#fca5a5', '#fcd34d', '#c4b5fd', '#f9a8d4', '#67e8f9', '#fdba74', '#a3e635', '#fb7185', '#93c5fd', '#5eead4'];
const SNAPSHOT_TYPES = { service: 'server', server: 'server', app: 'monitor', application: 'monitor', worker: 'cog', agent: 'bot', job: 'timer', process: 'activity', container: 'container', function: 'square-function', method: 'square-function', class: 'braces', module: 'package', package: 'package', component: 'component', hook: 'anchor', interface: 'plug', type: 'type', file: 'file-code', repo: 'git-fork', repository: 'git-fork', library: 'library', script: 'terminal', database: 'database', db: 'database', table: 'table', schema: 'columns-3', model: 'boxes', entity: 'box', field: 'hash', cache: 'hard-drive', queue: 'inbox', topic: 'radio', stream: 'waves', api: 'webhook', endpoint: 'link', route: 'route', page: 'layout', ui: 'layout', view: 'eye', event: 'zap', task: 'check', milestone: 'milestone', release: 'rocket', incident: 'alert-triangle', bug: 'bug', test: 'test-tube', experiment: 'flask-conical', workflow: 'workflow', step: 'split', pipeline: 'git-branch', deployment: 'upload', concept: 'brain', idea: 'lightbulb', insight: 'sparkles', note: 'sticky-note', definition: 'book-open', requirement: 'ruler', decision: 'scale', question: 'message-square', lesson: 'book', doc: 'file-text', document: 'file-text', spec: 'file-text', example: 'shapes', artifact: 'box', reference: 'link', person: 'user', user: 'user', team: 'users', org: 'building-2', organization: 'building-2', company: 'building-2', role: 'briefcase', project: 'briefcase', domain: 'globe', cluster: 'boxes', network: 'network', host: 'cpu', secret: 'key', policy: 'shield', config: 'settings', tool: 'wrench', metric: 'signal' };

function loadRules() {
  const candidates = [repoArg, process.env.LIGHTMESH_REPO, process.cwd()].filter(Boolean);
  for (const repo of candidates) {
    const src = path.join(repo, 'apps/web/src/lib/graph/typeStyles.ts');
    if (!existsSync(src)) continue;
    const text = readFileSync(src, 'utf8');
    const block = (name) => text.slice(text.indexOf(name), text.indexOf('};', text.indexOf(name)));
    const icons = [...block('ICON_CATALOG').matchAll(/^\s*'?([a-z0-9-]+)'?:/gm)].map((m) => m[1]);
    const types = Object.fromEntries([...block('DEFAULT_ICON_BY_TYPE').matchAll(/^\s*'?([a-z0-9-]+)'?:\s*'([a-z0-9-]+)'/gm)].map((m) => [m[1], m[2]]));
    const pal = text.slice(text.indexOf('DEFAULT_PALETTE'), text.indexOf('];', text.indexOf('DEFAULT_PALETTE')));
    const palette = [...pal.matchAll(/'(#[0-9a-f]{6})'/gi)].map((m) => m[1]);
    if (icons.length > 50 && palette.length) return { icons: new Set(icons), types, palette, source: src };
  }
  return { icons: new Set(SNAPSHOT_ICONS), types: SNAPSHOT_TYPES, palette: SNAPSHOT_PALETTE, source: 'embedded snapshot' };
}
const rules = loadRules();
const hashColor = (type) => {
  let h = 0;
  for (let i = 0; i < type.length; i += 1) h = (h * 31 + type.charCodeAt(i)) | 0;
  return rules.palette[Math.abs(h) % rules.palette.length];
};

// ---- measurements -------------------------------------------------------------------------------------
const nodes = doc.nodes ?? [];
const edges = doc.edges ?? [];
const styles = doc.graph?.typeStyles ?? {};
const findings = []; // { area, level: 'fix'|'improve'|'ok', msg }
const add = (area, level, msg) => findings.push({ area, level, msg });

const types = [...new Set(nodes.map((n) => n.type))];
const countBy = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
const typeCount = countBy(nodes.map((n) => n.type));
const degree = new Map(nodes.map((n) => [n.id, 0]));
for (const e of edges) for (const end of [e.source, e.target]) degree.set(end, (degree.get(end) ?? 0) + 1);

// Size and density
const n = nodes.length;
const avgDeg = n ? (2 * edges.length) / n : 0;
if (n < 5) add('size', 'improve', `Only ${n} nodes — too small to show structure; add the entities the question needs.`);
else if (n > 60) add('size', 'improve', `${n} nodes in one view — past ~60 the layout turns to noise. Use contexts, or split detail into a follow-up branch.`);
if (n >= 5 && avgDeg < 1.2) add('density', 'improve', `Sparse (avg degree ${avgDeg.toFixed(1)}): readers see islands, not a system. Add the relationships that explain *why* things connect.`);
if (avgDeg > 6) add('density', 'improve', `Dense (avg degree ${avgDeg.toFixed(1)}): a hairball. Drop "related-to"-style edges that assert nothing.`);

// Hubs: size grows with sqrt(degree), so one giant hub dwarfs everything and pulls the layout into a star.
const sorted = [...degree.entries()].sort((a, b) => b[1] - a[1]);
if (sorted.length > 6 && edges.length) {
  const [hubId, hubDeg] = sorted[0];
  const share = hubDeg / edges.length;
  if (share > 0.4 && hubDeg >= 6) add('layout', 'fix', `"${hubId}" touches ${Math.round(share * 100)}% of edges — a star layout. Replace "everything part-of root" with real relationships, or group via intermediate nodes/contexts.`);
}
// Category hubs: nodes that exist only to group others ("Causes", "Backend") via containment edges. Each
// becomes a small star, and the grouping is better expressed as a context the reader can toggle.
const CONTAINMENT = /^(part-of|belongs-to|member-of|in|contains|has-part|is-a|category|grouped-under|under)$/i;
const hubs = nodes.filter((x) => {
  const own = edges.filter((e) => e.source === x.id || e.target === x.id);
  return own.length >= 6 && own.filter((e) => CONTAINMENT.test(e.type)).length / own.length >= 0.7;
});
if (hubs.length) add('layout', 'fix', `Category hub(s) ${hubs.map((x) => `"${x.name}"`).join(', ')} group their neighbours with containment edges — each draws as a star. Use metadata.contexts for the grouping and keep edges for real relationships.`);

// Edge vocabulary: the edge-type filter is a legend too.
const edgeTypes = countBy(edges.map((e) => e.type));
const edgeSingles = [...edgeTypes].filter(([, c]) => c === 1).map(([t]) => t);
if (edgeTypes.size > 10 || (edgeTypes.size > 5 && edgeSingles.length / edgeTypes.size > 0.4))
  add('types', 'improve', `${edgeTypes.size} edge types, ${edgeSingles.length} used once (${edgeSingles.slice(0, 6).join(', ')}) — the edge filter becomes a word list. Settle on ~4–8 verbs and put nuance in edge labels.`);

const orphans = nodes.filter((x) => !degree.get(x.id));
if (orphans.length) add('layout', orphans.length > 2 ? 'fix' : 'improve', `${orphans.length} unconnected node(s): ${orphans.slice(0, 5).map((x) => x.id).join(', ')} — they float at the edge of the canvas.`);

// Types: count, singletons, icons, colours
if (types.length > 10) add('types', 'improve', `${types.length} node types — the legend stops helping past ~8. Merge near-synonyms.`);
const singletons = types.filter((t) => typeCount.get(t) === 1);
if (singletons.length > 2 && singletons.length / Math.max(types.length, 1) > 0.4) add('types', 'improve', `${singletons.length} types used once (${singletons.slice(0, 5).join(', ')}) — types should classify, not name.`);
const lower = countBy(types.map((t) => t.toLowerCase().replace(/[-_ ]/g, '').replace(/s$/, '')));
for (const [k, c] of lower) if (c > 1) add('types', 'fix', `Near-duplicate types collapse to "${k}": ${types.filter((t) => t.toLowerCase().replace(/[-_ ]/g, '').replace(/s$/, '') === k).join(', ')}.`);

const resolvedIcon = (t) => styles[t]?.icon ?? rules.types[t.toLowerCase()] ?? null;
for (const t of types) {
  const s = styles[t];
  if (s?.icon && !rules.icons.has(s.icon)) add('style', 'fix', `typeStyles.${t}.icon "${s.icon}" is not in the app's icon catalog — it will render as the default. Pick one from the catalog.`);
  if (s?.color && !/^#[0-9a-fA-F]{6}$/.test(s.color)) add('style', 'fix', `typeStyles.${t}.color "${s.color}" must be #rrggbb.`);
  if (!resolvedIcon(t)) add('style', 'improve', `Type "${t}" has no default icon (renders as a generic dot) — rename to a recognised type or set typeStyles.${t}.icon.`);
}
const colorOf = (t) => (styles[t]?.color ?? hashColor(t)).toLowerCase();
const byColor = countBy(types.map(colorOf));
const clashes = [...byColor].filter(([, c]) => c > 1).map(([col]) => `${types.filter((t) => colorOf(t) === col).join(' & ')} (${col})`);
if (clashes.length) add('style', 'fix', `Types share a colour, so the canvas cannot tell them apart: ${clashes.join('; ')}. Set distinct typeStyles colours.`);
const iconClash = countBy(types.map((t) => resolvedIcon(t) ?? 'circle-dot'));
const iconDupes = [...iconClash].filter(([, c]) => c > 1).map(([i]) => `${types.filter((t) => (resolvedIcon(t) ?? 'circle-dot') === i).join(' & ')} → ${i}`);
if (iconDupes.length) add('style', 'improve', `Types share an icon: ${iconDupes.join('; ')}.`);

// Labels: names are drawn untruncated on the canvas.
const longNames = nodes.filter((x) => (x.name ?? '').length > 28);
if (longNames.length) add('labels', longNames.length > 3 ? 'fix' : 'improve', `${longNames.length} node name(s) over 28 chars (drawn in full, they overlap): ${longNames.slice(0, 3).map((x) => `"${x.name}"`).join(', ')}. Move detail into properties.description.`);
const dupNames = [...countBy(nodes.map((x) => x.name))].filter(([, c]) => c > 1).map(([nm]) => nm);
if (dupNames.length) add('labels', 'fix', `Duplicate node names confuse readers and search: ${dupNames.slice(0, 5).join(', ')}.`);
const longEdge = edges.filter((e) => (e.label ?? e.type ?? '').length > 24);
if (longEdge.length) add('labels', 'improve', `${longEdge.length} edge label(s) over 24 chars — edge labels sit on the line; keep them to 1–3 words.`);
const vague = edges.filter((e) => /^(related|relates|related-to|connects?|linked?|associated|has|uses?)$/i.test(e.type));
if (vague.length > 0.25 * edges.length && vague.length > 2) add('meaning', 'improve', `${vague.length}/${edges.length} edges use vague types (related-to/has/uses) — say what the relationship does.`);

// Redundant edges
const pairs = countBy(edges.map((e) => `${e.source}>${e.target}>${e.type}`));
const dupEdges = [...pairs].filter(([, c]) => c > 1).length;
if (dupEdges) add('layout', 'fix', `${dupEdges} duplicated edge(s) (same source, target and type).`);
const sym = edges.filter((e) => edges.some((f) => f.source === e.target && f.target === e.source && f.type === e.type && f !== e));
if (sym.length) add('meaning', 'improve', `${sym.length / 2} pair(s) of mirror edges with the same type — one direction is enough unless the relationship really runs both ways.`);

// Usefulness
const described = nodes.filter((x) => String(x.properties?.description ?? '').trim().length >= 12).length;
if (n && described / n < 0.9) add('useful', described / n < 0.5 ? 'fix' : 'improve', `${n - described}/${n} nodes lack a real description — the Inspector is empty for them and search cannot find them by meaning.`);
const richProps = nodes.filter((x) => Object.keys(x.properties ?? {}).filter((k) => k !== 'description').length > 0).length;
if (n > 8 && richProps / n < 0.3) add('useful', 'improve', 'Few nodes carry filterable facts beyond description (owner, status, language, layer…) — property filters have nothing to work with.');
const attached = nodes.filter((x) => (x.data ?? []).length).length;
if (n > 8 && attached === 0) add('useful', 'improve', 'No attachments at all — add source links (vscode://…:line), diagrams, or insights where a reader would ask "where is this?"');
const contexts = [...new Set([...nodes, ...edges].flatMap((x) => x.metadata?.contexts ?? []))];
if (n > 25 && contexts.length === 0) add('useful', 'improve', 'Large graph with no contexts — tag 2–5 stories (e.g. "Happy Path", "Failure") so readers can switch views.');
if (contexts.length > 7) add('useful', 'improve', `${contexts.length} contexts — more than ~7 and the overlay stops being a quick switch.`);
if (!doc.graph?.description) add('useful', 'improve', 'graph.description is empty — say what question the graph answers.');
if (!Object.keys(styles).length && types.length > 3) add('style', 'improve', 'No typeStyles — defaults work, but choosing colours by meaning (data = one hue family, compute = another) makes the map readable at a glance.');

// ---- score & report ----------------------------------------------------------------------------------
const fixes = findings.filter((f) => f.level === 'fix').length;
const improves = findings.filter((f) => f.level === 'improve').length;
const score = Math.max(0, 100 - fixes * 12 - improves * 4);
const summary = { graph: doc.graph?.id, nodes: n, edges: edges.length, types: types.length, avgDegree: +avgDeg.toFixed(2), contexts: contexts.length, score, rules: rules.source };
if (asJson) {
  console.log(JSON.stringify({ summary, findings }, null, 2));
} else {
  console.log(`${summary.graph}: ${n} nodes, ${edges.length} edges, ${types.length} types, avg degree ${summary.avgDegree}, ${contexts.length} contexts`);
  console.log(`design score ${score}/100  (${fixes} fix, ${improves} improve)  · rules: ${rules.source}`);
  console.log('type palette: ' + types.map((t) => `${t}=${resolvedIcon(t) ?? 'circle-dot'}/${colorOf(t)}`).join('  '));
  for (const f of findings) console.log(`${f.level === 'fix' ? '✗ FIX    ' : '! IMPROVE'} [${f.area}] ${f.msg}`);
  if (!findings.length) console.log('✓ nothing to improve');
}
