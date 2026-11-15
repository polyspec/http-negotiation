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
//   - every job of a workflow that CI runs (ci.yml and the workflows that it calls) and of release.yml is one recipe of
//     the Makefile, and a job of release.yml takes the values of its run through the env of the job: it has
//     one run step `make ci-<job>` with make variables alone, whose value is a word, a matrix value or an input of the
//     called workflow, and every other step is a uses step; a run step has no condition, environment or shell of its own,
//     and no job or workflow sets an environment. The job ci-passed passes the JSON of needs, `RESULTS='${{ toJSON(needs)
//     }}'`, because it judges the other jobs and exists only in CI;
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
const RECIPE_TARGETS = ['release-go-static', 'release-wheel', 'release-php-ext', 'release-npm-platform', 'release-npm', 'release-go-module', 'release-binding-check', 'release-platform-assets', 'install-wasm-bindgen'];
const EXPRESSION = String.raw`\$\{\{[^}]*\}\}`;
const VALUE = String.raw`(?:(?:[A-Za-z0-9_./-]|${EXPRESSION})+|"(?:[A-Za-z0-9_. -]|${EXPRESSION})+"|'${EXPRESSION}')`;
const RUN = new RegExp(String.raw`^make ([a-z][a-z0-9-]*)((?: (?:[A-Z][A-Z0-9_]*=${VALUE}|${EXPRESSION}))*)$`);
const PINNED = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}$/;
// The one run step of a job of a workflow that CI runs: make ci-<job> with make variables whose value is a word, a matrix
// value or an input of the called workflow.
const JOB_RUN = /^make (ci-[a-z0-9-]+)((?: [A-Z][A-Z0-9_]*=(?:[A-Za-z0-9_./-]+|\$\{\{ (?:matrix|inputs)\.[a-z0-9_-]+ \}\}))*)$/;
const JUDGEMENT_RUN = "make ci-passed RESULTS='${{ toJSON(needs) }}'";

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

const jobOf = (text: string, name: string): string => {
  const lines = text.split('\n');
  const start = lines.indexOf(`  ${name}:`);
  if (start < 0) return '';
  const end = lines.findIndex((line, index) => index > start && /^ {2}[a-z][a-z0-9_-]*:$/.test(line));
  return lines.slice(start, end < 0 ? undefined : end).join('\n');
};

/** The workflows that CI runs: ci.yml and every workflow that a workflow of them calls. */
function ciWorkflows(): string[] {
  const found = [CI];
  for (let at = 0; at < found.length; at += 1)
    for (const match of read(found[at] as string).matchAll(/^ {4}uses: \.\/(\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml)$/gm))
      if (!found.includes(match[1] as string)) found.push(match[1] as string);
  return found;
}

const jobNames = (text: string): string[] => [...(text.split(/^jobs:\n/m)[1] ?? '').matchAll(/^ {2}([a-z][a-z0-9_-]*):$/gm)].map((match) => match[1] as string);
const stepsOf = (job: string): string[] => (job.split(/^ {4}steps:\n/m)[1] ?? '').split(/(?=^ {6}- )/m).filter((step) => /^ {6}- /.test(step));
/** The keys of a step: those of its first line and of the lines at its own depth. */
const keysOf = (step: string): string[] =>
  step.split('\n').flatMap((line) => /^(?: {6}- | {8})([a-z][a-z-]*):/.exec(line)?.[1] ?? []);

/** The findings of the rule that every job of a workflow that CI runs is one recipe ci-<job> of the Makefile. */
function jobFindings(file: string, text: string, targets: Set<string>): string[] {
  const found: string[] = [];
  if (/^env:/m.test(text)) found.push(`${file}: sets an environment for its jobs`);
  for (const name of jobNames(text)) {
    const job = jobOf(text, name);
    const at = `${file}: job ${name}`;
    // The jobs of release.yml take the values of the event and of the run, such as the token and the outputs of needs,
    // through the env of the job, so that their run line stays make ci-<job>.
    if (/^ {4}defaults:/m.test(job) || (file !== RELEASE && /^ {4}env:/m.test(job))) found.push(`${at}: sets an environment or defaults for its steps`);
    if (/^ {4}uses: /m.test(job)) {
      if (/^ {4}steps:/m.test(job)) found.push(`${at}: calls a workflow and has steps`);
      continue;
    }
    const steps = stepsOf(job);
    const runs = steps.filter((step) => keysOf(step).includes('run'));
    if (runs.length !== 1) found.push(`${at}: has ${String(runs.length)} run steps, not one`);
    for (const step of steps) {
      const keys = keysOf(step);
      if (keys.includes('uses') === keys.includes('run')) {
        found.push(`${at}: a step is neither a uses step nor a run step: ${step.trim().split('\n')[0] ?? ''}`);
        continue;
      }
      if (keys.includes('uses')) continue;
      const extra = keys.filter((key) => !['run', 'name', 'id'].includes(key));
      if (extra.length > 0) found.push(`${at}: the run step sets ${extra.join(', ')}`);
      const run = /^(?: {6}- | {8})run: *(.*)$/m.exec(step)?.[1]?.trim() ?? '';
      if (name === 'ci-passed') {
        if (run !== JUDGEMENT_RUN) found.push(`${at}: the run step is not ${JUDGEMENT_RUN}: ${run}`);
        continue;
      }
      const target = JOB_RUN.exec(run)?.[1];
      if (target === undefined) found.push(`${at}: the run step is not make ci-${name} with make variables alone: ${run}`);
      else if (target !== `ci-${name}`) found.push(`${at}: the run step calls ${target}, not ci-${name}`);
      else if (!targets.has(target)) found.push(`${at}: the Makefile defines no target ${target}`);
    }
  }
  return found;
}

test('every job of a workflow that CI or the release runs is one recipe ci-<job> of the Makefile, which its one run step calls', () => {
  const targets = makeTargets();
  const list = [...ciWorkflows(), RELEASE];
  assert.ok(list.includes(ASSETS), list.join('\n'));
  assert.deepEqual(list.flatMap((file) => jobFindings(file, read(file), targets)), []);
});

test('the rule of one recipe per job rejects a second run step, a condition, an expression and a wrong target', () => {
  const targets = makeTargets();
  const text = read(CI);
  assert.deepEqual(jobFindings(CI, text, targets), []);
  const run = '      - run: make ci-check NAME=${{ matrix.name }}\n';
  assert.ok(text.includes(run), 'the job check runs make ci-check NAME=${{ matrix.name }}');
  const mutations: [string, string, string][] = [
    [run, run + '      - run: make ci-summary\n', 'has 2 run steps'],
    [run, '', 'has 0 run steps'],
    [run, run.replace('- run:', '- if: ${{ !cancelled() }}\n        run:'), 'the run step sets if'],
    [run, run.replace('- run:', '- env:\n          X: y\n        run:'), 'the run step sets env'],
    [run, run.replace('${{ matrix.name }}', '${{ github.ref }}'), 'with make variables alone'],
    [run, run.replace('NAME=${{ matrix.name }}', '"${{ matrix.name }}"'), 'with make variables alone'],
    [run, run.replace('ci-check', 'ci-targets'), 'calls ci-targets, not ci-check'],
    [run, run.replace('ci-check', 'ci-undefined'), 'calls ci-undefined'],
    [run, run.replace('make ci-check NAME=${{ matrix.name }}', '|\n          make ci-check'), 'with make variables alone'],
    ["RESULTS='${{ toJSON(needs) }}'", "RESULTS='${{ toJSON(needs) }}' X=${{ github.sha }}", 'the run step is not'],
    ['permissions:\n', 'env:\n  X: y\npermissions:\n', 'sets an environment for its jobs'],
  ];
  for (const [from, to, message] of mutations) {
    assert.ok(text.includes(from), `the fixture contains ${from}`);
    assert.ok(jobFindings(CI, text.replace(from, to), targets).some((finding) => finding.includes(message)), `the rule accepted ${from} -> ${to}`);
  }
});

/** The recipe of `target` in the text of a Makefile: its lines, each with its continuation lines joined. */
function recipeOf(makefile: string, target: string): string[] {
  const lines = makefile.split('\n');
  // A line that assigns a target-specific variable, such as ci-php: LD_LIBRARY_PATH :=, is no rule of the recipe.
  const start = lines.findIndex((line) => new RegExp(`^${target.replaceAll('.', '\\.')} *:(?!=)(?!.*=)`).test(line));
  if (start < 0) return [];
  const recipe: string[] = [];
  for (let at = start + 1; at < lines.length && (lines[at] as string).startsWith('\t'); at += 1) {
    let line = (lines[at] as string).slice(1);
    while (line.endsWith('\\') && at + 1 < lines.length) line = line.slice(0, -1) + ' ' + (lines[(at += 1)] as string).trim();
    recipe.push(line);
  }
  return recipe;
}

/**
 * The make calls of `recipe`, one for each goal of each `$(MAKE)`: `make <goal> <variables>`, without the options of the
 * call. A goal of one call with several goals is a call of its own, since make -k runs each of them.
 */
const makeCalls = (recipe: readonly string[]): string[] =>
  recipe.flatMap((line) => line.split('$(MAKE)').slice(1).flatMap((call) => {
    const words = (call.split(/;|&&|\|\|/)[0] ?? '').match(/[A-Z][A-Z0-9_]*=(?:"[^"]*"|\S+)|\S+/g) ?? [];
    // A word that ends the call of a function of make, such as release-binding-check) of $(if ...), loses the parentheses
    // that it does not open.
    const unwrap = (word: string): string => (word.endsWith(')') && word.split('(').length < word.split(')').length ? unwrap(word.slice(0, -1)) : word);
    const cleaned = words.map(unwrap).filter((word) => word !== '' && !word.startsWith('-'));
    const variables = cleaned.filter((word) => /^[A-Z][A-Z0-9_]*=/.test(word));
    return cleaned.filter((word) => !word.includes('=')).map((goal) => ['make', goal, ...variables].join(' '));
  }));

const stepRun = (step: string): string | undefined => /^(?: {6}- | {8})run: (.*)$/m.exec(step)?.[1];

/** What a job runs: each of its run steps, and the make calls of the recipe of the target of each, read from the Makefile. */
function runsOf(job: string, makefile: string): string[] {
  return stepsOf(job).flatMap((step) => {
    const run = stepRun(step);
    if (run === undefined) return [];
    const target = RUN.exec(run)?.[1];
    return [run, ...(target === undefined ? [] : makeCalls(recipeOf(makefile, target)))];
  });
}

test('assets.yml builds each platform on its runner and the job npm, and ci and release call it', () => {
  const text = read(ASSETS);
  assert.match(text, /^ {2}workflow_call:$/m);
  for (const [platform, runner] of Object.entries(PLATFORM_RUNNERS))
    assert.match(text, new RegExp(`- platform: ${platform}\\n +runner: ${runner.replaceAll('.', '\\.')}\\n`), `${platform} on ${runner}`);
  const runs = jobNames(text).flatMap((name) => runsOf(jobOf(text, name), read('Makefile')));
  for (const target of ['release-recipes', 'release-binding-check', 'release-go-static', 'release-wheel', 'release-php-ext', 'release-npm-platform', 'install-wasm-bindgen', 'release-npm'])
    assert.ok(runs.some((run) => run === `make ${target}` || run.startsWith(`make ${target} `)), target);
  for (const file of [CI, RELEASE]) assert.match(read(file), /^ {4}uses: \.\/\.github\/workflows\/assets\.yml$/m, file);
  assert.match(read(CI), /needs: \[[^\]]*\bassets\b[^\]]*\]/);
});

test('release.yml downloads the assets of each platform before ci-release, which adds them after the draft release exists', () => {
  const job = jobOf(read(RELEASE), 'release');
  const steps = stepsOf(job);
  const download = steps.findIndex((step) => /uses: actions\/download-artifact@/.test(step) && /path: var\/release\/platform-assets$/m.test(step));
  const run = steps.findIndex((step) => stepRun(step) !== undefined);
  assert.ok(download >= 0 && download < run, 'the job downloads into var/release/platform-assets before its run step');
  const recipe = recipeOf(read('Makefile'), 'ci-release');
  const order = [/ release-publish$/, /cp -R var\/release\/platform-assets\/\. var\/release\/assets\//, / release-go-module$/, / release-platform-assets$/, / release-undraft$/]
    .map((pattern) => recipe.findIndex((line) => pattern.test(line)));
  assert.ok(order.every((index) => index >= 0), recipe.join('\n'));
  assert.deepEqual([...order].sort((x, y) => x - y), order, recipe.join('\n'));
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

// ASSET-1/5: native platform coverage belongs to this repository's workflow, while binding owns the build recipes.
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
function assertAssetOwnership(source: string, makefile = read('Makefile')): void {
  const runs = jobNames(source).flatMap(name => runsOf(jobOf(source, name), makefile));
  for (const target of ['release-go-static', 'release-wheel', 'release-npm-platform', 'release-php-ext', 'release-npm']) {
    assert.equal(runs.filter(run => run === `make ${target}` || run.startsWith(`make ${target} `)).length, 1, `${target} has exactly one owning job`);
  }
  assert.equal([...source.matchAll(/^ {6}- uses: shivammathur\/setup-php@/gm)].length, 1, 'only the PHP job selects PHP');
}

test('T1.14-6 ASSET-1: non-PHP assets build exactly once on every native platform', () => {
  const source = readFileSync(join(root, '.github/workflows/assets.yml'), 'utf8');
  const job = assetJob(source, 'platform');
  assert.deepEqual(assetMatrix(job), NATIVE_PLATFORMS);
  assertAssetOwnership(source);
  const runs = runsOf(job, read('Makefile'));
  assert.doesNotMatch(job, /uses: shivammathur\/setup-php@/, 'the non-PHP job selects no PHP runtime');
  assert.ok(!runs.some(run => run.startsWith('make release-php-ext')), 'the non-PHP job builds no PHP extension');
  for (const target of ['release-go-static', 'release-wheel', 'release-npm-platform']) {
    assert.equal(runs.filter(run => run === `make ${target}`).length, 1, `${target} runs once per platform`);
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

/**
 * The PHP job selects its runtime with one setup, then its one run step passes the minor of its entry to make ci-php, whose
 * recipe prepares the inputs of the job and builds the extension once with the php that the setup selected.
 */
function assertPhpBuild(job: string, makefile = read('Makefile')): void {
  const steps = assetSteps(job);
  const setup = steps.filter(step => /uses: shivammathur\/setup-php@/.test(step));
  const builds = steps.filter(step => stepRun(step) !== undefined);
  assert.equal(setup.length, 1);
  assert.equal(builds.length, 1);
  assert.match(setup[0] ?? '', /^ {10}php-version: '\$\{\{ matrix\.php \}\}'$/m);
  assert.ok(steps.indexOf(setup[0] ?? '') < steps.indexOf(builds[0] ?? ''), 'runtime setup precedes the build');
  assert.match(stepRun(builds[0] ?? '') ?? '', /^make ci-php .*\bEXPECTED_PHP_MINOR=\$\{\{ matrix\.php \}\}(?: |$)/);
  const runs = runsOf(job, makefile);
  assert.deepEqual(runs.filter(run => run.startsWith('make release-php-ext')), ['make release-php-ext PHP=php EXPECTED_PHP_MINOR=$(EXPECTED_PHP_MINOR)'], 'the recipe builds the extension once for the expected minor');
  for (const target of ['install-binding', 'release-recipes'])
    assert.equal(runs.filter(run => run === `make ${target}`).length, 1, `${target} prepares this PHP job's inputs`);
  assert.equal(runs.filter(run => run === 'make install-tools TOOLS=rust').length, 1);
}

test('T1.17 ASSET-5: each PHP job selects one minor and its recipe invokes one generated guarded build', () => {
  assertPhpBuild(assetJob(readFileSync(join(root, '.github/workflows/assets.yml'), 'utf8'), 'php'));
});

test('T1.14-6 ASSET-1, T1.17 ASSET-5: reject unexamined matrices and misplaced runtime selection', () => {
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
  const build = steps.find(step => stepRun(step) !== undefined);
  assert.ok(setup && build);
  assert.throws(() => assertPhpBuild(job.replace(setup, '').replace(build, build + setup)), /setup precedes/);
  const version = "          php-version: '${{ matrix.php }}'\n";
  assert.throws(() => assertPhpBuild(job.replace(version, '').replace(build, build + version)));
  // The recipes of the jobs: a build repeated in its recipe or dropped from it is a finding.
  const makefile = read('Makefile');
  const builds = ' release-go-static release-wheel release-npm-platform';
  assert.ok(makefile.includes(builds), 'ci-platform builds release-go-static, release-wheel and release-npm-platform');
  assert.throws(() => assertAssetOwnership(source, makefile.replace(builds, builds + ' release-wheel')), /owning job/);
  assert.throws(() => assertAssetOwnership(source, makefile.replace(builds, ' release-go-static release-npm-platform')), /owning job/);
  const phpBuild = '\t$(MAKE) --no-print-directory release-php-ext PHP=php EXPECTED_PHP_MINOR=$(EXPECTED_PHP_MINOR)\n';
  assert.ok(makefile.includes(phpBuild), 'ci-php builds the extension');
  assert.throws(() => assertPhpBuild(job, makefile.replace(phpBuild, phpBuild + phpBuild)), /expected minor/);
  assert.throws(() => assertPhpBuild(job, makefile.replace(phpBuild, phpBuild.replace('PHP=php ', ''))), /expected minor/);
  assert.throws(() => assertPhpBuild(job.replace(' EXPECTED_PHP_MINOR=${{ matrix.php }}', '')));
});

test('T1.14-6 ASSET-3: every asset job has a distinct artifact for each matrix result', () => {
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
