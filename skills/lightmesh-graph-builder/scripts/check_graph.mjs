#!/usr/bin/env node
// Pre-flight check for a LightMesh file before import:
//   node check_graph.mjs path/to/graph.lightmesh.json [--core /path/to/lightmesh/repo]
// Uses the real validator and linter from @lightmesh/core when it can find the LightMesh repo (cwd, --core,
// or LIGHTMESH_REPO); otherwise runs equivalent built-in checks. Exit 1 on any error.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('usage: check_graph.mjs <file.json> [--core <repo>]');
  process.exit(2);
}
const coreFlag = args.indexOf('--core');
const repos = [coreFlag >= 0 ? args[coreFlag + 1] : null, process.env.LIGHTMESH_REPO, process.cwd()].filter(Boolean);

let doc;
try {
  doc = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`✗ not valid JSON: ${e.message}`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const infos = [];
let core = null;
for (const repo of repos) {
  const entry = path.join(repo, 'node_modules/@lightmesh/core/dist/index.js');
  if (existsSync(entry)) {
    core = await import(entry);
    break;
  }
}

if (core) {
  const report = core.validateLightMeshFile(doc);
  for (const i of report.issues ?? []) errors.push(`${i.path}: ${i.message}`);
  if (report.valid) {
    // The engine also checks what the schema cannot: journey references and edge endpoints.
    const graph = new core.LightMeshGraph();
    const res = graph.import(doc, 'replace');
    if (res.status !== 'success') errors.push(`import: ${res.message}`);
    for (const i of core.lintGraph(doc.nodes, doc.edges)) {
      const line = `${i.code}: ${i.message ?? JSON.stringify(i)}`;
      (i.severity === 'error' ? errors : i.severity === 'warning' ? warnings : infos).push(line);
    }
  }
} else {
  basicChecks(doc);
}
summarise(doc);

function basicChecks(d) {
  const allowed = new Set(['schema', 'graph', 'nodes', 'edges']);
  for (const k of Object.keys(d)) if (!allowed.has(k)) errors.push(`unknown top-level key "${k}"`);
  if (d.schema?.name !== 'lightmesh' || !['1.0', '1.1'].includes(d.schema?.version))
    errors.push('schema must be { "name": "lightmesh", "version": "1.1" }');
  if (!d.graph?.id?.trim() || !d.graph?.name?.trim()) errors.push('graph.id and graph.name are required');
  const nodes = Array.isArray(d.nodes) ? d.nodes : (errors.push('nodes must be an array'), []);
  const edges = Array.isArray(d.edges) ? d.edges : (errors.push('edges must be an array'), []);
  const ids = new Set();
  for (const n of nodes) {
    for (const f of ['id', 'type', 'name']) if (!String(n[f] ?? '').trim()) errors.push(`node ${n.id ?? '?'}: ${f} required`);
    if (ids.has(n.id)) errors.push(`duplicate node id "${n.id}"`);
    ids.add(n.id);
  }
  const edgeIds = new Set();
  const degree = new Map();
  for (const e of edges) {
    for (const f of ['id', 'source', 'target', 'type']) if (!String(e[f] ?? '').trim()) errors.push(`edge ${e.id ?? '?'}: ${f} required`);
    if (edgeIds.has(e.id)) errors.push(`duplicate edge id "${e.id}"`);
    edgeIds.add(e.id);
    for (const end of [e.source, e.target]) {
      if (!ids.has(end)) errors.push(`edge ${e.id}: endpoint "${end}" is not a node`);
      degree.set(end, (degree.get(end) ?? 0) + 1);
    }
  }
  for (const n of nodes) {
    if (!degree.get(n.id)) warnings.push(`orphan-node: "${n.id}" has no edges`);
    if (!n.properties?.description) infos.push(`missing-description: "${n.id}"`);
  }
  const steps = d.graph?.journey?.steps ?? [];
  const stepIds = new Set();
  for (const s of steps) {
    if (stepIds.has(s.id)) errors.push(`duplicate journey step id "${s.id}"`);
    stepIds.add(s.id);
    if (!s.title?.trim()) errors.push(`journey step "${s.id}": title required`);
    for (const id of s.nodeIds ?? []) if (!ids.has(id)) errors.push(`journey step "${s.id}": unknown node "${id}"`);
  }
  warnings.push('(built-in checks only — pass --core <lightmesh repo> for the authoritative validator)');
}

function summarise(d) {
  const n = d.nodes?.length ?? 0;
  const e = d.edges?.length ?? 0;
  const types = [...new Set((d.nodes ?? []).map((x) => x.type))].join(', ');
  console.log(`${d.graph?.id ?? '?'}: ${n} nodes, ${e} edges, ${d.graph?.journey?.steps?.length ?? 0} journey steps`);
  console.log(`node types: ${types || '—'}`);
  for (const m of errors) console.log(`✗ ${m}`);
  for (const m of warnings) console.log(`! ${m}`);
  if (infos.length) console.log(`i ${infos.length} info: ${infos.slice(0, 5).join('; ')}${infos.length > 5 ? '; …' : ''}`);
  if (n > 2000 || e > 5000) console.log('✗ over the per-graph limit (2,000 nodes / 5,000 edges)');
  console.log(errors.length ? 'FAIL' : 'OK');
  process.exit(errors.length ? 1 : 0);
}
