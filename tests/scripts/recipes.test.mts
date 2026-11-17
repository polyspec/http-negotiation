// The recipes of the binding targets (AGENTS.md, "Bindings"): they run the node and the npm of var/tools by their paths
// and download nothing, and the targets that read http-media-type build what they read from the checkout of
// http-media-type at the commit of Cargo.lock, which make install-binding clones (T1.7, T1.9). The test reads a dry run
// of the recipes (make --dry-run), so no recipe runs.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const dryRun = (...goals: string[]): string[] =>
  execFileSync('make', ['--dry-run', '--no-print-directory', ...goals], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, MAKEFLAGS: '', MAKELEVEL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
    .split('\n')
    .filter((line) => line !== '');

const GOALS = ['check-declarations', 'test-python', 'test-node', 'test-wasm', 'test-php', 'test-go', 'lint-bindings'];

test('the binding recipes run the tools of var/tools and download nothing', () => {
  const lines = dryRun(...GOALS);
  assert.ok(lines.length > 0, 'the dry run printed no line');
  const bare = lines.filter((line) => /(^|&& |; )(node|npm|npx) /.test(line));
  assert.deepEqual(bare, [], 'a recipe runs the node or the npm of the PATH');
  const downloads = lines.filter((line) => / ci( |$)|pip install(?!.* --no-index)|npm install(?!.* --offline)/.test(line));
  assert.deepEqual(downloads, [], 'a recipe downloads');
});

test('test-python and test-php build the wheel and the extension of http-media-type (T1.9)', () => {
  const python = dryRun('test-python');
  assert.ok(python.some((line) => /maturin build .*--manifest-path \S*deps\/http-media-type\/packages\/python\/Cargo\.toml /.test(line)), `no wheel of http-media-type:\n${python.join('\n')}`);
  const php = dryRun('test-php');
  assert.ok(php.some((line) => /--manifest-path \S*deps\/http-media-type\/Cargo\.toml -p polyspec-http-media-type-php-ext /.test(line)), `no extension of http-media-type:\n${php.join('\n')}`);
});

test('test-go builds the static library of http-media-type and resolves its Go module by a go.work (T1.7)', () => {
  const lines = dryRun('test-go');
  assert.ok(lines.some((line) => /--manifest-path \S*deps\/http-media-type\/Cargo\.toml -p polyspec-http-media-type-go /.test(line)), `no static library of http-media-type:\n${lines.join('\n')}`);
  assert.ok(lines.some((line) => /-p polyspec-http-negotiation-go .*--features panic-test,fault-test,codec-test/.test(line)), `the Go crate is not built with its test features:\n${lines.join('\n')}`);
  const goTest = lines.filter((line) => / test -count=1 /.test(line));
  assert.equal(goTest.length, 1, `go test runs ${goTest.length} times:\n${lines.join('\n')}`);
  assert.match(goTest[0] ?? '', /GOWORK=\S*go\.work/);
  assert.match(goTest[0] ?? '', /polyspec_http_negotiation_fault_test/);
});

test('lint-bindings lints the Go crate with its feature codec-test', () => {
  const lines = dryRun('lint-bindings').filter((line) => /clippy .*--workspace/.test(line));
  assert.equal(lines.length, 1, 'lint-bindings runs clippy of the workspace once');
  assert.match(lines[0] ?? '', /--features \S*codec-test/);
});
