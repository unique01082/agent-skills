import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

const script = new URL('./send-to-lightread.mjs', import.meta.url);

async function startHandoff(path, extraArgs = []) {
  const child = spawn(process.execPath, [script.pathname, '--path', path, '--title', 'Test note', '--kind', 'TXT', '--no-open', '--ttl-ms', '100', ...extraArgs]);
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const exitCode = await new Promise((resolve) => child.once('close', resolve));
  assert.equal(exitCode, 0, stderr);
  return stdout.trim().split('\n').map((line) => JSON.parse(line));
}

test('uses a separate storage location for each handoff', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lightread-lite-test-'));
  const path = join(directory, 'note.txt');
  await writeFile(path, 'hello');
  const [first, second] = await Promise.all([startHandoff(path), startHandoff(path)]);
  const firstUrl = new URL(first[0].handoffUrl);
  const secondUrl = new URL(second[0].handoffUrl);
  assert.match(firstUrl.searchParams.get('handoff'), /^[0-9a-f-]{36}$/);
  assert.notEqual(firstUrl.searchParams.get('handoff'), secondUrl.searchParams.get('handoff'));
});

test('adds silent mode only when explicitly requested', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lightread-lite-test-'));
  const path = join(directory, 'note.txt');
  await writeFile(path, 'hello');
  const normal = new URL((await startHandoff(path))[0].handoffUrl);
  const silent = new URL((await startHandoff(path, ['--silent']))[0].handoffUrl);
  assert.equal(new URLSearchParams(normal.hash.slice(1)).has('silent'), false);
  assert.equal(new URLSearchParams(silent.hash.slice(1)).get('silent'), '1');
});
