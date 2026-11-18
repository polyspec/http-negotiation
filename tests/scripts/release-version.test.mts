// The tool that sets the version of the release on the manifests (make release-version VERSION=X.Y.Z, T1.34), run on a
// fixture tree: every place of config/release-version.json takes the version; a manifest outside that list that still
// carries the old version fails the run with no change; a second run gives the same bytes; and the make path passes the
// version as the one argument.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tool = join(root, 'scripts', 'release-version.mts');
const config = join(root, 'config', 'release-version.json');
const OLD = '0.0.6';
const NEW = '0.0.7';

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'release-version-'));
  mkdirSync(join(dir, 'config'), { recursive: true });
  cpSync(config, join(dir, 'config', 'release-version.json'));
  const files: Record<string, string> = {
    'Cargo.toml': `[workspace]\nmembers = []\n\n[workspace.package]\nversion = "${OLD}"\nedition = "2021"\n`,
    'packages/go/internal/ffi/Cargo.toml': `[package]\nname = "a"\nversion = "${OLD}"\n`,
    'packages/php-ext/Cargo.toml': `[package]\nname = "b"\nversion = "${OLD}"\n`,
    'packages/python/Cargo.toml': `[package]\nname = "c"\nversion = "${OLD}"\n`,
    'packages/ts/Cargo.toml': `[package]\nname = "d"\nversion = "${OLD}"\n`,
    'packages/ts/wasm/Cargo.toml': `[package]\nname = "e"\nversion = "${OLD}"\n`,
    'packages/python/pyproject.toml': `[project]\nname = "f"\nversion = "${OLD}"\nrequires-python = ">=3.14"\n`,
    'packages/ts/package.json': `{\n  "name": "g",\n  "version": "${OLD}",\n  "private": true\n}\n`,
  };
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(join(dir, dirname(file)), { recursive: true });
    writeFileSync(join(dir, file), text);
  }
  return dir;
}

function run(dir: string, version: string) {
  return spawnSync(process.execPath, [tool, version, '--root', dir], { encoding: 'utf8' });
}

function snapshot(dir: string): string {
  const list = JSON.parse(readFileSync(join(dir, 'config', 'release-version.json'), 'utf8')) as { sites: { file: string }[] };
  return list.sites.map((site) => readFileSync(join(dir, site.file), 'utf8')).join('\n----\n');
}

test('every place of the list takes the version, and nothing else changes', () => {
  const dir = fixture();
  try {
    const result = run(dir, NEW);
    assert.equal(result.status, 0, result.stderr);
    const list = JSON.parse(readFileSync(join(dir, 'config', 'release-version.json'), 'utf8')) as { sites: { file: string }[] };
    for (const site of list.sites) {
      const text = readFileSync(join(dir, site.file), 'utf8');
      assert.doesNotMatch(text, new RegExp(OLD.replace(/\./g, '\\.')), `${site.file} still carries ${OLD}`);
      assert.match(text, new RegExp(NEW.replace(/\./g, '\\.')), `${site.file} takes ${NEW}`);
    }
    assert.match(readFileSync(join(dir, 'Cargo.toml'), 'utf8'), /\[workspace\.package\]\nversion = "0\.0\.7"\nedition = "2021"\n/);
    assert.equal(readFileSync(join(dir, 'packages/ts/package.json'), 'utf8'), `{\n  "name": "g",\n  "version": "${NEW}",\n  "private": true\n}\n`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a manifest outside the list that still carries the old version fails the run and changes nothing', () => {
  const dir = fixture();
  try {
    mkdirSync(join(dir, 'packages/extra'), { recursive: true });
    writeFileSync(join(dir, 'packages/extra/Cargo.toml'), `[package]\nname = "x"\nversion = "${OLD}"\n`);
    const before = snapshot(dir);
    const result = run(dir, NEW);
    assert.notEqual(result.status, 0, 'the run fails');
    assert.match(result.stderr, /packages\/extra\/Cargo\.toml/, 'the run names the manifest outside the list');
    assert.equal(snapshot(dir), before, 'no manifest of the list changed');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a second run with the same version gives the same bytes (idempotent)', () => {
  const dir = fixture();
  try {
    assert.equal(run(dir, NEW).status, 0);
    const once = snapshot(dir);
    assert.equal(run(dir, NEW).status, 0);
    assert.equal(snapshot(dir), once);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the version must be X.Y.Z', () => {
  const dir = fixture();
  try {
    const before = snapshot(dir);
    const result = run(dir, '0.0.7-rc1');
    assert.notEqual(result.status, 0);
    assert.equal(snapshot(dir), before, 'no manifest changed');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the make path passes VERSION as the only argument, with no --root, and the tool sets it', () => {
  // The recipe of make release-version runs `node scripts/release-version.mts $(VERSION)`: the tool, copied into a fixture,
  // reads the version from its one argument and writes every place.
  const dir = fixture();
  try {
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    cpSync(tool, join(dir, 'scripts', 'release-version.mts'));
    const result = spawnSync(process.execPath, [join(dir, 'scripts', 'release-version.mts'), NEW], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(readFileSync(join(dir, 'Cargo.toml'), 'utf8'), new RegExp(`version = "${NEW.replace(/\./g, '\\.')}"`));
    assert.match(readFileSync(join(dir, 'packages/ts/package.json'), 'utf8'), new RegExp(`"version": "${NEW.replace(/\./g, '\\.')}"`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
