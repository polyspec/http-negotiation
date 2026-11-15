// The rules of the GitHub workflows (AGENTS.md, "CI and release"), checked on the tracked files of .github and on the
// Makefile:
//
//   - every job runs on ubuntu-26.04-arm, except the jobs platform and php of assets.yml, which runs on the runner of each platform
//     of the release, ubuntu-26.04, ubuntu-26.04-arm or macos-15, because the asset of a platform is built and loaded only
//     on that platform: no tool of the release compiles for another platform (binding GN-19a);
//   - every action is a local action of .github/actions or a workflow of .github/workflows, or is pinned by its full
//     commit;
//   - no job and no step sets timeout-minutes;
//   - every run step is one make target that the Makefile defines, or that the release recipes define that it includes
//     (packages/release.mk, which binding release-recipes writes and which is not tracked, binding GN-19h), with
//     arguments NAME=value or expressions alone;
//   - the workflows ci and release call assets.yml (binding GN-19i), and the release job of release.yml downloads the
//     assets of each platform and runs release-go-module and release-platform-assets after release-publish has created
//     the draft release, and release-undraft last.
//
// The test reads the files as text, line by line: the workflows hold one key on a line.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const read = (file: string): string => readFileSync(join(root, file), 'utf8');
const RUNNER = 'ubuntu-26.04-arm';
const ASSETS = '.github/workflows/assets.yml';
const CI = '.github/workflows/ci.yml';
const RELEASE = '.github/workflows/release.yml';
// The runner of each platform of the release (binding GN-19a).
const PLATFORM_RUNNERS: Record<string, string> = { 'linux-x64-gnu': 'ubuntu-26.04', 'linux-arm64-gnu': 'ubuntu-26.04-arm', 'darwin-arm64': 'macos-15' };
// The targets of packages/release.mk for a contract with the targets go, python, php, node and wasm (binding GN-19h).
const RECIPE_TARGETS = ['release-go-static', 'release-wheel', 'release-php-ext', 'release-npm-platform', 'release-npm', 'release-go-module', 'release-binding-check', 'release-platform-assets', 'install-llvm', 'install-wasm-bindgen'];
const EXPRESSION = String.raw`\$\{\{[^}]*\}\}`;
const VALUE = String.raw`(?:(?:[A-Za-z0-9_./-]|${EXPRESSION})+|"(?:[A-Za-z0-9_. -]|${EXPRESSION})+"|'${EXPRESSION}')`;
const RUN = new RegExp(String.raw`^make ([a-z][a-z0-9-]*)((?: (?:[A-Z][A-Z0-9_]*=${VALUE}|${EXPRESSION}))*)$`);
const PINNED = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}$/;

const files = (): string[] =>
  execFileSync('git', ['ls-files', '.github'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter((file) => /\.ya?ml$/.test(file));

function makeTargets(): Set<string> {
  const targets = new Set<string>(RECIPE_TARGETS);
  for (const line of read('Makefile').split('\n')) {
    const names = /^([a-z][A-Za-z0-9_.-]*(?: +[a-z][A-Za-z0-9_.-]*)*) *:(?!=)/.exec(line)?.[1];
    if (names !== undefined) for (const name of names.split(/ +/)) targets.add(name);
  }
  return targets;
}

const valueOf = (line: string, key: string): string | undefined => new RegExp(`^ *(?:- )?${key}: *(.*)$`).exec(line)?.[1]?.trim();

function findings(file: string, targets: Set<string>): string[] {
  const found: string[] = [];
  const lines = read(file).split('\n');
  lines.forEach((line, index) => {
    if (line.trim().startsWith('#')) return;
    const at = `${file}:${String(index + 1)}`;
    if (/^ *(?:- )?timeout-minutes:/.test(line)) found.push(`${at}: sets timeout-minutes`);
    const runner = valueOf(line, 'runs-on');
    if (runner !== undefined && runner !== RUNNER && !(file === ASSETS && runner === '${{ matrix.runner }}')) found.push(`${at}: runs on ${runner}, not on ${RUNNER}`);
    const uses = valueOf(line, 'uses')?.replace(/ +#.*$/, '');
    if (uses !== undefined && !uses.startsWith('./.github/') && !PINNED.test(uses)) found.push(`${at}: uses ${uses}, which is not pinned by a full commit`);
    const run = valueOf(line, 'run');
    const next = lines.slice(index + 1).find((later) => later.trim() !== '' && !later.trim().startsWith('#'));
    const deeper = next !== undefined && next.search(/\S/) > line.indexOf('run:');
    // A key `run:` with no value whose deeper lines are keys is the input `run` of a dispatch, no run step.
    if (run !== undefined && !(run === '' && deeper && /^ *[A-Za-z_-]+:(?: |$)/.test(next))) {
      const target = RUN.exec(run)?.[1];
      if (target === undefined) found.push(`${at}: the run step is not one make target: ${run}`);
      else if (!targets.has(target)) found.push(`${at}: the Makefile defines no target ${target}`);
    }
  });
  return found;
}

test('every workflow runs on its runner, pins its actions, sets no time limit and runs one make target per step', () => {
  const targets = makeTargets();
  const list = files();
  assert.ok(list.includes(CI) && list.includes(RELEASE), list.join('\n'));
  assert.deepEqual(list.flatMap((file) => findings(file, targets)), []);
});

test('assets.yml builds each platform on its runner and the job npm, and ci and release call it', () => {
  const text = read(ASSETS);
  assert.match(text, /^ {2}workflow_call:$/m);
  for (const [platform, runner] of Object.entries(PLATFORM_RUNNERS))
    assert.match(text, new RegExp(`- platform: ${platform}\\n +runner: ${runner.replaceAll('.', '\\.')}\\n`), `${platform} on ${runner}`);
  for (const target of ['release-recipes', 'release-binding-check', 'release-go-static', 'release-wheel', 'install-llvm', 'release-php-ext', 'release-npm-platform', 'install-wasm-bindgen', 'release-npm'])
    assert.match(text, new RegExp(`run: make ${target}( |$)`, 'm'), target);
  for (const file of [CI, RELEASE]) assert.match(read(file), /^ {4}uses: \.\/\.github\/workflows\/assets\.yml$/m, file);
  assert.match(read(CI), /needs: \[[^\]]*\bassets\b[^\]]*\]/);
});

test('release.yml uploads the assets of each platform to the draft release before it makes the release public', () => {
  const steps = read(RELEASE).split('\n').flatMap((line) => {
    const run = valueOf(line, 'run');
    if (run !== undefined) return [RUN.exec(run)?.[1] ?? run];
    return /uses: actions\/download-artifact@/.test(line) ? ['download-artifact'] : [];
  });
  const order = ['release-publish', 'download-artifact', 'release-go-module', 'release-platform-assets', 'release-undraft'];
  const at = order.map((step) => steps.indexOf(step));
  assert.ok(at.every((index) => index >= 0), `missing: ${order.filter((_, index) => at[index] < 0).join(', ')}`);
  assert.deepEqual([...at].sort((a, b) => a - b), at, steps.join(', '));
});

/** The member `key` of the JSON object `value`, or undefined. */
function member(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Object.entries(value).find(([name]) => name === key)?.[1] : undefined;
}

/** The JSON value of the file `file` of the repository. */
function readJson(file: string): unknown {
  const value: unknown = JSON.parse(readFileSync(join(root, file), 'utf8'));
  return value;
}

/** The PHP minors whose extension a release builds: phpExtension.minors of config/toolchain.json. */
function phpExtensionMinors(): string[] {
  const minors = member(member(readJson('config/toolchain.json'), 'phpExtension'), 'minors');
  assert.ok(Array.isArray(minors) && minors.length > 0 && minors.every(minor => typeof minor === 'string'), 'config/toolchain.json names the PHP minors of the extension in phpExtension.minors');
  return minors.map(String);
}

// ASSET-1/2: native platform coverage belongs to this repository's workflow, while binding owns the build recipes.
const NATIVE_PLATFORMS = Object.entries(PLATFORM_RUNNERS).map(([platform, runner]) => ({ platform, runner }));

function assetJob(source: string, name: string): string {
  const block = new RegExp(`^ {2}${name}:\\n([\\s\\S]*?)(?=^ {2}\\S|$(?![\\s\\S]))`, 'm').exec(source)?.[1];
  assert.ok(block, `assets.yml defines the job ${name}`);
  return block;
}

/** Read the literal include records that these owned asset jobs declare; refuse any unexamined matrix syntax. */
function assetMatrix(job: string): { platform: string; runner: string; php?: string }[] {
  assert.match(job, /^ {4}runs-on: \$\{\{ matrix\.runner \}\}$/m, 'the matrix job runs on its native runner selector');
  const matrix = /^ {6}matrix:\n([\s\S]*?)(?=^ {4}\S)/m.exec(job)?.[1];
  assert.ok(matrix, 'the asset job declares a literal matrix');
  const rows: { platform: string; runner: string; php?: string }[] = [];
  const rest = matrix.replace(/^ {8}include:\s*$/m, '').replace(/^ {10}- platform: ([\w-]+)\n {12}runner: ([\w.-]+)(?:\n {12}php: '(\d+\.\d+)')?/gm, (_entry, platform: string, runner: string, php: string | undefined) => {
    rows.push({ platform, runner, ...(php === undefined ? {} : { php }) });
    return '';
  }).trim();
  assert.equal(rest, '', `the asset matrix has no unchecked entries: ${rest}`);
  assert.ok(rows.length > 0, 'the asset matrix is nonempty');
  return rows;
}

function assetSteps(job: string): string[] {
  return job.split(/^(?= {6}- )/m).filter(step => /^ {6}- /m.test(step));
}

function assetArtifact(job: string): string {
  const uploads = assetSteps(job).filter(step => /uses: actions\/upload-artifact@/.test(step));
  assert.equal(uploads.length, 1, 'each job uploads one artifact');
  const name = /^ {10}name: (.+)$/m.exec(uploads[0] ?? '')?.[1];
  assert.ok(name, 'the upload declares its artifact name');
  return name;
}

/** Every build target belongs to one job; another job cannot silently repeat an asset producer. */
function assertAssetOwnership(source: string): void {
  for (const target of ['release-go-static', 'release-wheel', 'release-npm-platform', 'release-php-ext', 'release-npm']) {
    assert.equal([...source.matchAll(new RegExp(`^ {8}run: make ${target}(?: |$)`, 'gm'))].length, 1, `${target} has exactly one owning job`);
  }
  assert.equal([...source.matchAll(/^ {6}- uses: shivammathur\/setup-php@/gm)].length, 1, 'only the PHP job selects PHP');
}

test('T1.14-6 ASSET-1: non-PHP assets build exactly once on every native platform', () => {
  const source = readFileSync(join(root, '.github/workflows/assets.yml'), 'utf8');
  const job = assetJob(source, 'platform');
  assert.deepEqual(assetMatrix(job), NATIVE_PLATFORMS);
  assertAssetOwnership(source);
  assert.doesNotMatch(job, /uses: shivammathur\/setup-php@|run: make release-php-ext\b/, 'the non-PHP job selects and builds no PHP runtime');
  for (const target of ['release-go-static', 'release-wheel', 'release-npm-platform']) {
    assert.equal(assetSteps(job).filter(step => new RegExp(`run: make ${target}\\s*$`, 'm').test(step)).length, 1, `${target} runs once per platform`);
  }
  assert.equal(assetArtifact(job), 'assets-${{ matrix.platform }}');
});

function assertPhpCoverage(job: string): void {
  const minors = phpExtensionMinors();
  const range = String(member(member(readJson('packages/php-ext/composer.json'), 'require'), 'php'));
  const lower = /^>=\s*(\d+\.\d+)/.exec(range)?.[1];
  assert.ok(lower, `packages/php-ext/composer.json requires a PHP range with a lower bound, not ${range}`);
  assert.equal(minors[0], lower, 'the first minor of phpExtension.minors is the lower bound of the PHP range of packages/php-ext/composer.json');
  const rows = assetMatrix(job);
  const expected = NATIVE_PLATFORMS.flatMap(platform => minors.map(php => ({ ...platform, php })));
  const keys = (values: typeof rows) => values.map(row => `${row.platform}:${row.runner}:${row.php ?? ''}`).sort();
  assert.deepEqual(keys(rows), keys(expected), 'the matrix has no missing, repeated or foreign platform/minor pair');
}

test('T1.14-6 ASSET-1: PHP jobs cover every native platform and supported minor exactly once', () => {
  assertPhpCoverage(assetJob(read(ASSETS), 'php'));
});

function assertPhpBuild(job: string): void {
  const steps = assetSteps(job);
  const setup = steps.filter(step => /uses: shivammathur\/setup-php@/.test(step));
  const builds = steps.filter(step => /run: make release-php-ext\b/.test(step));
  assert.equal(setup.length, 1);
  assert.equal(builds.length, 1);
  assert.match(setup[0] ?? '', /^ {10}php-version: '\$\{\{ matrix\.php \}\}'$/m);
  assert.ok(steps.indexOf(setup[0] ?? '') < steps.indexOf(builds[0] ?? ''), 'runtime setup precedes the build');
  assert.match(builds[0] ?? '', /^ {8}run: make release-php-ext PHP=php EXPECTED_PHP_MINOR=\$\{\{ matrix\.php \}\}\s*$/m);
  assert.match(builds[0] ?? '', /if: \$\{\{ !cancelled\(\) \}\}/);
  assert.match(setup[0] ?? '', /if: \$\{\{ !cancelled\(\) \}\}/);
  for (const target of ['install-binding', 'release-recipes', 'install-llvm']) {
    const owned = steps.filter(step => new RegExp(`run: make ${target}\\s*$`, 'm').test(step));
    assert.equal(owned.length, 1, `${target} prepares this PHP job's inputs`);
    if (target === 'install-llvm') assert.match(owned[0] ?? '', /if: \$\{\{ !cancelled\(\) \}\}/);
  }
  assert.equal(steps.filter(step => /run: make install-tools TOOLS=rust\s*$/m.test(step)).length, 1);

}

test('T1.14-6 ASSET-2: each PHP job selects one minor and invokes one generated guarded build', () => {
  assertPhpBuild(assetJob(readFileSync(join(root, '.github/workflows/assets.yml'), 'utf8'), 'php'));
});

test('T1.14-6 ASSET-1/2: reject unexamined matrices and misplaced runtime selection', () => {
  const job = assetJob(readFileSync(join(root, '.github/workflows/assets.yml'), 'utf8'), 'php');
  for (const addition of ['        extra: [one, two]\n', '        exclude: []\n', '        include: []\n']) {
    assert.throws(() => assetMatrix(job.replace('        include:\n', `${addition}        include:\n`)), /unchecked entries/);
  }
  const source = readFileSync(join(root, '.github/workflows/assets.yml'), 'utf8');
  for (const target of ['release-php-ext', 'release-wheel']) {
    assert.throws(() => assertAssetOwnership(`${source}\n  extra:\n    steps:\n      - name: Repeat build\n        run: make ${target}\n`), /owning job/);
  }
  for (const name of ['platform', 'php']) {
    assert.throws(() => assetMatrix(assetJob(source, name).replace('runs-on: ${{ matrix.runner }}', 'runs-on: ubuntu-26.04')), /native runner selector/);
  }
  for (const addition of ['        extra: [one]\n', '        exclude: []\n']) {
    assert.throws(() => assetMatrix(assetJob(source, 'platform').replace('        include:\n', `${addition}        include:\n`)), /unchecked entries/);
  }
  const row = / {10}- platform: [\w-]+\n {12}runner: [\w.-]+\n {12}php: '\d+\.\d+'\n/.exec(job)?.[0];
  assert.ok(row);
  assert.throws(() => assertPhpCoverage(job.replace(row, '')), /missing, repeated/);
  assert.throws(() => assertPhpCoverage(job.replace(row, row + row)), /missing, repeated/);
  const steps = assetSteps(job);
  const setup = steps.find(step => /uses: shivammathur\/setup-php@/.test(step));
  const build = steps.find(step => /run: make release-php-ext\b/.test(step));
  assert.ok(setup && build);
  assert.throws(() => assertPhpBuild(job.replace(setup, '').replace(build, build + setup)), /setup precedes/);
  const version = "          php-version: '${{ matrix.php }}'\n";
  assert.throws(() => assertPhpBuild(job.replace(version, '').replace(build, build + version)));
});

test('T1.14-6 ASSET-2: every asset job has a distinct artifact for each matrix result', () => {
  const source = readFileSync(join(root, '.github/workflows/assets.yml'), 'utf8');
  const names: string[] = [];
  for (const name of ['platform', 'php', 'npm']) {
    const job = assetJob(source, name);
    const artifact = assetArtifact(job);
    if (name === 'php') assert.equal(artifact, 'assets-php-${{ matrix.platform }}-${{ matrix.php }}');
    const rows = name === 'npm' ? [{}] : assetMatrix(job);
    for (const row of rows) names.push(artifact.replace('${{ matrix.platform }}', 'platform' in row ? String(row.platform) : '').replace('${{ matrix.php }}', 'php' in row ? String(row.php) : ''));
  }
  assert.equal(new Set(names).size, names.length, 'no job or matrix result overwrites another artifact');
  const release = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8');
  assert.match(release, /pattern: assets-\*/);
  assert.match(release, /merge-multiple: true/);
});
