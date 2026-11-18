// The native module that the build writes beside a package (packages/ts/*.darwin-arm64.node and the other platforms) is
// ignored by git, so it is not shown as a change, and the checks that read the tracked files do not depend on it. The test asks
// git whether a module of that name is ignored: git check-ignore prints the path and exits 0 when it is, and fails otherwise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('the native module beside a TypeScript package is ignored by git', () => {
  const module = 'packages/ts/example.darwin-arm64.node';
  const out = execFileSync('git', ['check-ignore', module], { cwd: root, encoding: 'utf8' });
  assert.equal(out.trim(), module);
});
