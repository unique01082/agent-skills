#!/usr/bin/env node
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const TEXT_MAX = 10 * 1024 * 1024;
const IMAGE_MAX = 25 * 1024 * 1024;
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const METADATA_HEADER = 'X-LightRead-Handoff-Metadata';
const RULES = {
  TXT: { extensions: ['.txt'], mimeType: 'text/plain' },
  MARKDOWN: { extensions: ['.md', '.markdown'], mimeType: 'text/markdown' },
  HTML: { extensions: ['.html'], mimeType: 'text/html' },
  MDX: { extensions: ['.mdx'], mimeType: 'text/mdx' },
  JSX: { extensions: ['.jsx'], mimeType: 'text/jsx' },
  MERMAID: { extensions: ['.mmd', '.mermaid'], mimeType: 'text/vnd.mermaid' },
};
const IMAGE_MIMES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif',
};

function parseArgs(argv) {
  const result = { importBaseUrl: 'https://lightread.baole.space', ttlMs: DEFAULT_TTL_MS, open: true };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--no-open') result.open = false;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[++index];
      if (!value) throw new Error(`Missing value for ${arg}`);
      if (key === 'path') result.path = resolve(value);
      else if (key === 'title') result.title = value.trim();
      else if (key === 'kind') result.kind = value.toUpperCase();
      else if (key === 'import-base-url') result.importBaseUrl = value;
      else if (key === 'allowed-origin') result.allowedOrigin = value;
      else if (key === 'ttl-ms') result.ttlMs = Number(value);
      else throw new Error(`Unknown option ${arg}`);
    } else throw new Error(`Unexpected argument ${arg}`);
  }
  return result;
}

const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const formatBytes = (size) => size < 1024 ? `${size} bytes` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

async function createPreview(metadata) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="260" viewBox="0 0 720 260">
<rect width="720" height="260" rx="28" fill="#f7f5ef"/><rect x="24" y="24" width="672" height="212" rx="20" fill="#fff" stroke="#dedbd2"/>
<circle cx="62" cy="62" r="15" fill="#f2b84b"/><text x="88" y="69" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#20211f">Save to LightRead</text>
<text x="48" y="126" font-family="system-ui,sans-serif" font-size="25" font-weight="650" fill="#20211f">${xml(metadata.title)}</text>
<text x="48" y="162" font-family="system-ui,sans-serif" font-size="16" fill="#6d716b">${xml(metadata.kind)} · ${xml(formatBytes(metadata.size))} · ${xml(metadata.filename)}</text>
<rect x="48" y="184" width="624" height="32" rx="10" fill="#eef5ea"/><text x="64" y="206" font-family="system-ui,sans-serif" font-size="14" fill="#3d6840">Browser handoff ready · finish the import in LightRead</text>
</svg>`;
  const path = join(tmpdir(), `lightread-lite-${randomUUID()}.svg`);
  await writeFile(path, svg, { encoding: 'utf8', mode: 0o600 });
  return path;
}

function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  return new Promise((resolveOpen, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', detached: process.platform !== 'win32' });
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolveOpen(); });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.path || !options.title || !options.kind) throw new Error('--path, --title, and --kind are required');
  if (options.title.length > 160) throw new Error('Title must contain 1 to 160 characters');
  if (!Number.isInteger(options.ttlMs) || options.ttlMs < 100) throw new Error('--ttl-ms must be an integer of at least 100');
  if (!(await stat(options.path)).isFile()) throw new Error('--path must point to a file');
  const filename = basename(options.path);
  if (!filename || filename.length > 255 || filename.includes('/') || filename.includes('\\')) throw new Error('Filename must be a safe basename');
  const extension = extname(filename).toLowerCase();
  const rule = RULES[options.kind];
  const mimeType = options.kind === 'IMAGE' ? IMAGE_MIMES[extension] : rule?.extensions.includes(extension) ? rule.mimeType : undefined;
  if (!mimeType) throw new Error('Kind and filename extension do not match a supported LightRead document type');
  const bytes = await readFile(options.path);
  const maximum = options.kind === 'IMAGE' ? IMAGE_MAX : TEXT_MAX;
  if (bytes.length < 1 || bytes.length > maximum) throw new Error('Document size is outside the LightRead limit');
  if (options.kind !== 'IMAGE') {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.includes('\0')) throw new Error('Text document must contain valid UTF-8 without NUL bytes');
  }
  const importUrl = new URL(options.importBaseUrl);
  const allowedOrigin = options.allowedOrigin ?? importUrl.origin;
  if (new URL(allowedOrigin).origin !== allowedOrigin) throw new Error('--allowed-origin must be an origin without a path');
  const token = randomBytes(32).toString('base64url');
  const metadata = { v: 1, clientRequestId: randomUUID(), title: options.title, kind: options.kind, filename, mimeType, size: bytes.length };
  const previewPath = await createPreview(metadata);
  let state = 'ready';
  let expiry;
  const server = createServer({ maxHeaderSize: 8 * 1024, headersTimeout: 5000, requestTimeout: 5000 }, (request, response) => {
    const origin = typeof request.headers.origin === 'string' ? request.headers.origin : '';
    const address = server.address();
    const expectedHost = address && typeof address !== 'string' ? `127.0.0.1:${address.port}` : '';
    const route = request.url ?? '';
    const candidate = route.startsWith('/v1/handoff/') ? route.slice('/v1/handoff/'.length) : '';
    const candidateBytes = Buffer.from(candidate, 'utf8');
    const tokenBytes = Buffer.from(token);
    const matches = candidateBytes.length === tokenBytes.length && timingSafeEqual(candidateBytes, tokenBytes);
    const cors = () => { response.setHeader('Access-Control-Allow-Origin', allowedOrigin); response.setHeader('Vary', 'Origin'); };
    if (request.headers.host !== expectedHost || origin !== allowedOrigin || route !== `/v1/handoff/${token}` || !matches) { request.resume(); response.writeHead(403).end('Invalid handoff request'); return; }
    if (request.method === 'OPTIONS') { cors(); response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); response.writeHead(204).end(); return; }
    if (request.method !== 'GET' || request.headers['content-length'] || request.headers['transfer-encoding']) { request.resume(); cors(); response.writeHead(405).end('Method not allowed'); return; }
    if (state !== 'ready') { request.resume(); cors(); response.writeHead(410).end('Handoff is no longer available'); return; }
    state = 'in-flight'; cors();
    response.setHeader('Access-Control-Expose-Headers', `${METADATA_HEADER}, Content-Length`);
    response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Type', mimeType); response.setHeader('Content-Length', bytes.length);
    response.setHeader(METADATA_HEADER, Buffer.from(JSON.stringify(metadata)).toString('base64url'));
    response.once('finish', () => { state = 'consumed'; process.stdout.write(`${JSON.stringify({ status: 'consumed' })}\n`); clearTimeout(expiry); setTimeout(() => server.close(), 250); });
    response.once('close', () => { if (state === 'in-flight' && !response.writableFinished) state = 'ready'; });
    response.end(bytes);
  });
  await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveListen); });
  const address = server.address();
  const expiresAt = new Date(Date.now() + options.ttlMs).toISOString();
  importUrl.pathname = '/import'; importUrl.search = ''; importUrl.hash = new URLSearchParams({ v: '1', port: String(address.port), token }).toString();
  process.stdout.write(`${JSON.stringify({ status: 'ready', title: metadata.title, kind: metadata.kind, size: metadata.size, previewPath, expiresAt, handoffUrl: options.open ? undefined : importUrl.toString() })}\n`);
  if (options.open) await openBrowser(importUrl.toString());
  expiry = setTimeout(() => { if (state === 'ready') { state = 'expired'; process.stdout.write(`${JSON.stringify({ status: 'expired' })}\n`); server.close(); } }, options.ttlMs);
  const close = () => { clearTimeout(expiry); server.close(); };
  process.once('SIGINT', close); process.once('SIGTERM', close);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
