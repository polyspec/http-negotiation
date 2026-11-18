<!-- doc-id: changelog -->

## Unreleased

- The rehearsal of the Go module runs release-recipes before rehearse-go-module, so a new checkout has packages/release.mk
  when the rehearsal starts (T1.35).

## 0.0.6

- binding 0.0.21 and http-media-type 0.0.9 (T1.28): the bindings and the core use the release of http-media-type that pins
  binding 0.0.21, so `Cargo.lock` pins one `polyspec-binding-core`, at 0.0.21.

- The test of binding reads the version of binding from the release asset that `package.json` names, and checks that every
  Cargo manifest and `Cargo.lock` name that release, so a pin of binding changes no expected value of the test (T1.27).

- The recipes read the test features of each binding crate from its manifest (T1.22), and the build tags of `go test`
  come from the same list.
- The jobs of `assets.yml` run `bindings-check` when they do not release (T1.23), so that CI runs on each runner of the
  release what the release runs.
- kit is pinned at its release 0.0.120, and `make release-candidate-assets` builds the archives of the release from the
  committed HEAD with no tag; the job check of CI runs it (T1.24).

## 0.0.5

- http-media-type 0.0.8 (T1.21): `polyspec-http-media-type` of every Cargo manifest names `tag = "v0.0.8"`, and the
  Python, PHP and Go packages require http-media-type 0.0.8. The jobs of `assets.yml` install go before
  `make release-binding-check`, which reads `packages/go/go.sum`. 0.0.4 was not published: its release run stopped in
  those jobs, which had no go.

## 0.0.4

- binding 0.0.17, kit 0.0.119 and http-media-type 0.0.7 (T1.20): `polyspec-binding-core` of every Cargo manifest names
  `tag = "v0.0.17"`, `polyspec-http-media-type` names `tag = "v0.0.7"`, which depends on binding 0.0.17, `Cargo.lock`
  pins one `polyspec-binding-core` (CK-20), and `package.json` names the release assets of `@polyspec/binding` 0.0.17
  and `@polyspec/kit` 0.0.119, whose integrity `package-lock.json` pins. The Python, PHP and Go packages require
  http-media-type 0.0.7, and `packages/go/go.sum` pins its Go module. binding check and generate take `--cargo` (GN-1d).
  Each case row of `packages/rust/interface.json` names its result key and the keys that the core tests read, and the
  cases of `contracts/negotiate.json` give their description under `note`, the key of G-5, instead of `label` (CK-96).
  `make test-go` gives the build tags `polyspec_http_negotiation_<feature>` under which binding 0.0.17 writes the
  generated Go tests.

## 0.0.3

- binding 0.0.10 and http-media-type 0.0.6 (T1.19): `polyspec-binding-core` of every Cargo manifest names `tag = "v0.0.10"`, `polyspec-http-media-type` names `tag = "v0.0.6"`, which depends on binding 0.0.10, `Cargo.lock`
  pins one `polyspec-binding-core` (CK-20), and `package.json` names the release asset of `@polyspec/binding` 0.0.10,
  whose integrity `package-lock.json` pins.

## 0.0.2

- binding 0.0.9, http-media-type 0.0.5 and kit 0.0.114 (T1.18): `polyspec-binding-core` of every Cargo manifest names
  `tag = "v0.0.9"`, `polyspec-http-media-type` names `tag = "v0.0.5"`, which depends on binding 0.0.9, so `Cargo.lock`
  pins one `polyspec-binding-core` (CK-20), and `package.json` names the release assets of `@polyspec/binding` 0.0.9
  and `@polyspec/kit` 0.0.114, whose integrity `package-lock.json` pins. `make ci-php` runs with `DYLD_LIBRARY_PATH`
  and `LD_LIBRARY_PATH` empty, because install-llvm-action puts `/usr/lib` first in both on macOS and the PHP of
  Homebrew then loads the libsqlite3 of the system and aborts; the workflow test reads the recipe of `ci-php` past its
  lines of target-specific variables.

- binding 0.0.8 (T1.14): `polyspec-binding-core` of every Cargo manifest names `tag = "v0.0.8"`, `polyspec-http-media-type` names `tag = "v0.0.4"`, and `package.json`
  names the release asset of `@polyspec/binding` 0.0.8, whose integrity `package-lock.json` pins. binding 0.0.8 writes no
  recipe `install-llvm`, so `make ci-php` installs no LLVM: the ubuntu-26.04 images hold the LLVM of
  `config/toolchain.json` at `/usr/lib/llvm-<major>`, and on macOS the job `php` of `assets.yml` installs it with
  install-llvm-action, whose `LLVM_PATH` the Makefile takes as `LLVM_ROOT` (binding GN-19i).

## 0.0.1

- The core and the binding crates depend on http-media-type 0.0.3 and on binding 0.0.5, the release that
  http-media-type 0.0.3 depends on (T1.14-5): every Cargo manifest names the tags `v0.0.3` and `v0.0.5`, `package.json`
  names the release asset of binding 0.0.5 and of kit 0.0.113, binding scaffold of 0.0.5 writes `packages/go/go.mod`,
  `packages/php-ext/composer.json` and `packages/python/pyproject.toml` with http-media-type 0.0.3, and `Cargo.lock`
  pins one `polyspec-binding-core`. Before, `Cargo.lock` pinned binding 0.0.2 beside 0.0.3, `binding check` reported
  CK-20 and the test of `Cargo.lock` failed. `make test-scripts` passes 21 of 21 tests and `make bindings-check`
  passes.

- The jobs of `release.yml` are one recipe each too (T1.17): `make ci-tag` and `make ci-release`, which read the
  token, the id of the CI run, the actor and the tag from the `env:` of the job. `ci-tag` gives release-tag a file of its
  own for `GITHUB_ENV` and reads TAG and VERSION from it in the same step. The job `release` downloads the assets of
  each platform into `var/release/platform-assets` before its run step, and `ci-release` adds them to
  `var/release/assets` after it created the draft release, so the order of publish, assets and undraft stays.

- Every job of `ci.yml` and `assets.yml` is one recipe of the Makefile (T1.17): its one run step is `make ci-check
  NAME=<name>`, `make ci-platform`, `make ci-php EXPECTED_PHP_MINOR=<minor>` or `make ci-npm`, with `RELEASE`, the input
  of the called workflow, and the job `ci-passed` runs `make ci-passed RESULTS='<json of needs>'`. Before, a job held
  its installs, its step conditions and its targets in YAML steps and expressions, so a local run could not repeat it
  without the runner of GitHub. The recipe now runs the installs first and stops at their failure, then the checks to
  their end, then the summary always; the targets of each entry of the job `check` are `CI_CHECK_TARGETS_<name>` of
  the Makefile, and `ci-passed` sets `FAIL_SKIPPED` itself. `tests/scripts/workflows.test.mts` fails a job with more
  than one run step, a condition or an environment on a run step, an expression other than a matrix value or an input,
  and a target other than `ci-<job>`; it failed on the workflows before the change and passes after it. ASSET-5 of
  `docs/spec/native-assets.md` states the PHP job as its recipe and retires ASSET-2, whose steps ran after a failed step.

- The asset workflow separates three non-PHP platform builds from six native PHP platform/minor builds (T1.14-6, ASSET-1 to ASSET-4). Supported build minors are declared as 8.4 and 8.5. Each PHP job selects one runtime before one expected-minor build and uploads a unique artifact. Owner assertions reject incorrect matrix syntax, coverage, runners, runtime setup and duplicate producers. Native/full CI proof still waits for a published generated expected-minor gate and regenerated recipes.

  Workflow owner tests pass 8/8. The declared `make test-scripts` check has 18 passed and one failure: the existing lock includes binding-core 0.0.2 while the direct manifest/test pin requires 0.0.3. T1.14-6 remains active until the matching published dependency graph is pinned and that check passes; this change updates no dependency pin.

- The release holds the packages of the bindings per platform as assets of its GitHub Release. binding 0.0.3 writes
  the release recipes of the contract (binding GN-19h): `make release-recipes` runs `binding release-recipes --root .`,
  which writes the ignored file `packages/release.mk`, and the Makefile includes it after it defines `BINDING_RUN`,
  `NODE`, `NPM`, `UV` and `BINDING_DEP`, so the repository keeps no recipe of its own. The new workflow
  `.github/workflows/assets.yml` builds on `ubuntu-26.04`, `ubuntu-26.04-arm` and `macos-15` the static library of
  the Go module, the abi3 wheel, the PHP extension for PHP 8.4 and 8.5 and the npm platform package of each platform,
  and on `ubuntu-26.04-arm` the npm package with its WASM module (binding GN-19a, GN-19i). `ci.yml` calls it for every
  run, and `release.yml` calls it for the tag, creates the draft release with the Composer package of the PHP extension,
  carries the Go module with `make release-go-module`, uploads the assets with `make release-platform-assets` and makes
  the release public. `config/release.json` releases the Composer package of `packages/php-ext` and no longer names
  `packages/go` in `goModules`, because `make release-go-module` tags the commit that adds the generated files and the
  static libraries (binding GN-19f). The dependency on binding is the release 0.0.3 (`package.json`,
  `package-lock.json`, the tag `v0.0.3` of `polyspec-binding-core` of every Cargo manifest, and `Cargo.lock`);
  `@napi-rs/cli` 3.10.12 is a devDependency, `config/toolchain.json` pins LLVM 21, `rust-toolchain.toml` names
  `llvm-tools` and the musl targets of the Linux arches, and `mise.toml` with `mise.lock` names uv 0.12.24. The target
  `release-checkout` is removed, since each job of the release checks out the tag. The new test
  `tests/scripts/workflows.test.mts` checks the runners, the pins, the run steps and the order of the release steps.
  `Cargo.lock` still pins the binding 0.0.2 of http-media-type 0.0.1 beside 0.0.3, so `binding check --release` reports
  CK-20 and the test of `Cargo.lock` in `tests/scripts/binding.test.mts` fails until http-media-type 0.0.2 is pinned
  (T1.14-5). Red: `binding check --release` reported CK-94 for the Makefile without the include, and `make
  test-scripts` failed the three tests of `workflows.test.mts` and the two tests of the binding release in
  `binding.test.mts`. Green: `binding check --release` reports CK-20 alone, `make test-scripts` passes 13 of 14 tests,
  and `make docs-check` and `make release-coverage` pass (T1.14).
- http-media-type is a released dependency. The core and the binding crates name the tag `v0.0.1` of http-media-type
  in place of its branch `v1/rust-core`, and `Cargo.lock` pins the commit of that tag. binding scaffold wrote the
  binding manifests again: `packages/go/go.mod` requires the Go module of http-media-type at `v0.0.1`, and the PHP
  package and the Python package require its release 0.0.1. `binding check --release` reports nothing (T1.9).
- binding is a released dependency. `polyspec-binding-core` of the core and of the binding crates names the tag
  `v0.0.2` of the binding repository in place of the branch `v1/rust-core`, and `Cargo.lock` pins the commit of the tag
  and http-media-type at the head of its branch, whose binding crates name the same tag; the dependency on
  http-media-type stays on its branch until http-media-type releases a tag (T1.9). The tool is the npm package
  `@polyspec/binding` of the same release, which `package.json` names by the URL of its release asset and
  `package-lock.json` pins by its integrity; the recipes run its `dist/cli.js`. `make install-binding` runs `cargo
  fetch --locked`, because binding reads the crates with `cargo metadata --locked --offline`, and `scripts/deps.mts`
  clones the checkout of http-media-type; `scripts/binding.mts`, which also cloned binding into `var/binding`, is
  removed. The new test `tests/scripts/binding.test.mts` failed its four tests on the branch dependency and passes with
  the release. The binding crates and the checks of binding run on the build queue, because binding reads the contract
  of http-media-type through Cargo.

- `make documents-stamp PATHS=<twin>` writes the `source-sha256` of each named Korean twin from its English file with
  the stamp of kit, after the translation is reviewed. Before, the marker was written by hand.

- `[profile.release]` sets `lto = false`; before, it set `lto = true`, with which a Go program that links the Go
  static library beside the static library of http-media-type, which the Go module requires, fails with duplicate symbols such as
  `rust_eh_personality` (binding GN-15i, CK-91). Cargo sets `lto` for a whole profile, so the PHP extension, the Node
  addon and the wheel of a release are built without LTO too. `Cargo.lock` pins `polyspec-binding-core` at the head
  of the branch `v1/rust-core` of binding, whose scaffold writes the binding packages as they are. The new test
  `tests/scripts/profile.test.mts` reads the profile of `Cargo.toml` and `.cargo/config.toml`: before the change
  `make test-scripts` failed one test, with it every test passed. `Cargo.lock` also pins `polyspec-http-media-type` at the head of its branch, whose release profile is the same. Verified: `make -k bindings-check test-scripts docs-check lint-bindings check-declarations test-python test-node test-wasm test-php test-go` passed; `make test-go` passes the 37 generated tests of `packages/go/accept` that failed with the binding pinned before.

- The binding targets build what they read and download nothing. `make install-binding` installs binding at the
  commit of `Cargo.lock`, fetches the crates of `Cargo.lock` and clones the checkout of http-media-type at its commit
  into `var/deps/http-media-type`, and CI runs it in every job; `scripts/binding.mts` reads them offline. `make
  media-type-python`, `make media-type-php` and `make media-type-go` generate and build the wheel, the PHP extension
  and the static library of http-media-type there, which `make test-python`, `make test-php` and `make test-go` read;
  before, the first two failed for a missing file in CI and `go vet` of `make test-go` failed with a missing `go.sum`
  entry for the Go module of http-media-type, which `var/go.work` now resolves (T1.7, T1.9). `make test-go` builds the
  Go crate with every feature of its manifest and runs go test with their build tags, and the Go case runner arms the
  faults of the case of the group internal through the entry point of the binding instead of failing it. `make
  lint-bindings` lints with the feature `codec-test` of the Go crate. `mise.toml` and `mise.lock` pin maturin 1.16.0
  at the digests of binding in place of a maturin that pip installed from PyPI; the recipes run the node and the npm of
  `var/tools/bin`, `make check-declarations` no longer runs `npm ci`, and the wheels and tarballs are installed
  offline. `tests/scripts/recipes.test.mts` checks each of these on a dry run of the recipes: before the change 4 of its
  tests failed, with it 5 passed. maturin builds the wheel of http-media-type from this checkout with the manifest of
  the clone, because the shim of mise refuses a folder whose `mise.toml` mise does not trust. Verified: `make
  test-python`, `make test-php`, `make test-node`, `make test-wasm`, `make check-declarations`, `make lint-bindings`,
  `make test-scripts` and `make docs-check` pass; `make test-go` passes the contract cases and fails 37 generated tests
  of `packages/go/accept`, whose cause row T1.7 names.

- The documents state the Go binding as it is with the pinned binding: binding generates Go for the contract, the Go
  binding imports the Go module of http-media-type, which `packages/go/go.mod` requires in the development form and no
  tracked file resolves, and `go vet` of a tree of the tracked files fails with a missing `go.sum` entry for it. Row
  T1.7 is open again and no longer bypassed: its cause was that binding refused Go, and what is left is the recipe of
  `make test-go`, which gives neither that module nor its static library, and the end-to-end check of binding on the target go, whose run gives the copy no `go.work` for that module. Row T1.10 is done: `make fmt-check` passes
  on the committed tree. `AGENTS.md` states that the generated Go files `zz_generated_*.go` are not tracked and why.

- `Cargo.lock` pins `polyspec-binding-core` and `polyspec-http-media-type` at the heads of the branch `v1/rust-core`
  of their repositories, and the binding packages are the ones that binding scaffold of that binding writes, so `make
  bindings-check` reports no finding. Before, it reported the lock (CK-20) and thirteen items (CK-19), one of them the
  Go module, which the scaffold did not write because the pinned http-media-type had no Go module. Each binding crate
  and `packages/python/pyproject.toml` name the licence `MIT` of the core (CK-71), and each `src/lib.rs` holds its
  allow attributes on one line, so `make fmt-check` passes (T1.10). `packages/python/build.rs` is new: it declares the
  cfg `pyo3_disable_reference_pool`, with which the generated code refuses a build (binding GN-6u).
  `packages/ts/package.json` has `"type": "module"`, `napi.binaryName` and `napi.targets` and no
  `optionalDependencies`: a release writes the platform packages into the manifest that it packs (binding GN-3c).
  `packages/php-ext/composer.json` requires the extension and the package of http-media-type, whose class the
  generated code needs when it is loaded (binding GN-3e), and names `php-ext.download-url-method`
  `pre-packaged-binary`. `packages/go/go.mod` requires the Go module of http-media-type in the development form
  `v0.0.0` (binding GN-15f). binding generates the five targets of the contract, Go included. `.gitignore` names the
  generated Go files `zz_generated_*.go`, which are not tracked: a release adds them and the static library of each
  platform in the commit of its Go tag (binding GN-15g).

- No tracked file names a Git commit. The changelog and the checklist named commits of this repository and of binding,
  which say nothing to a reader without the repository and name nothing after a history is joined or written again.
  Each record keeps its fact and states the binding as the pinned one or a later one. `AGENTS.md` holds the rule, and
  `make test-scripts` runs `tests/scripts/commits.test.mts`, which failed on the committed tree and passes now.

- The release tags the Go module `packages/go` with `packages/go/vX.Y.Z` at the release commit: `goModules` of
  `config/release.json` names the module. Before, `goModules` was empty and the rules said that a tag tags no Go
  module; Go takes a module below the root of a repository only by a tag of that form, so no other repository could
  require the module at a version (binding GN-15g). `make release-coverage` reports every package file classified.
  `AGENTS.md` states what is open before the first release: `main` on `origin`, and the packages of the bindings, which
  wait for kit 0.0.111 and a release of binding.

- The repository has its checks on GitHub and its release. Before, no workflow ran a check and no step tagged a
  commit or created a GitHub Release. `.github/workflows/ci.yml` runs `make check`, `make test-bindings` and `make
  release-coverage` on `ubuntu-26.04-arm` for the push of `main` and a manual run, in the jobs `core` and `bindings`,
  each target through `make ci-targets`, and its last job `ci-passed` passes only when both passed.
  `.github/workflows/release.yml` tags the commit of such a run with the version of the top section of `CHANGELOG.md`
  and creates its GitHub Release. `config/release.json` releases the core crate as a Git tag and no archive. The
  Makefile adds `install-php-tools`, the CI targets and the release targets. `make release-coverage` failed with "No
  rule to make target" and now reports that every package file is classified. The job `bindings` fails on `make
  test-python` and `make test-php` until a release of http-media-type holds the wheel and the PHP extension that they
  read, and on the Go targets until binding generates Go for the contract (T1.7).

- The repository has the plan `docs/plans/rust-core/plan.md` and its checklist `docs/plans/rust-core/checklist.md`, each
  with its Korean twin, in the form of the other polyspec repositories. The checklist records the steps of the core,
  the interface contract, the workspace of the binding crates, the bindings and the end-to-end check as done with the
  commits that did them, and the Go binding as bypassed until binding generates Go for the contract. `make docs-check`
  reads the documents of `config/documents.json` and the checklist with the rows of `config/checklist.json`, and `make
  check` runs it. Before, no check read the documents, so a Korean twin could fall behind its English source unseen.

- The tests of the core depend on the core itself with its feature `fault-test` (`[dev-dependencies]` of
  `packages/rust/Cargo.toml`), so `cargo test -p polyspec-http-negotiation` arms the fault injection point of the case
  `a_broken_index_is_internal` without a flag, and `make test` passes no feature. Before, the point of the pinned binding
  is live only with the feature of the crate that writes it (binding GN-5), and `cargo test` of the core, which the
  end-to-end check of binding runs, failed the case with "the faults of http_negotiation.internal did not fire".

- `make bindings` generates each target of the contract in its own target `make bindings-<target>` (`binding generate
  --target <target>`), on which each binding target depends: `make test-python` on `bindings-python`, `make
  node-package` and `make check-declarations` on `bindings-node` and `bindings-wasm`, `make test-php` on
  `bindings-php` and `make test-go` on `bindings-go` (binding GN-1c). Before, `make bindings` generated every target at
  once, so the refusal of go, which the pinned binding ends with status 1, stopped the targets of php, python, node and
  wasm, which binding generates. `AGENTS.md` and `README.md` state that binding generates those four and refuses go.

- `Cargo.lock` pins `polyspec-binding-core` at a later commit of binding, whose fault injection point is the macro
  `binding_core::fault::point!`, judged by the feature `fault-test` of the crate that writes it (binding GN-5): the
  point of `packages/rust/src/candidate.rs` is `point!(crate::fault::INTERNAL)`, and `make test` runs the tests of the
  core with its feature `fault-test`, which the contract test needs to arm the point; `make lint-rust` lints the core
  with and without it. Before, the core did not compile with the pinned binding, which has no function `fault::point`.

- `Cargo.lock` pins `polyspec-binding-core` at a later commit of binding, and the binding crates are the ones
  that binding scaffold of that commit writes (binding BD-9, GN-3d): each crate takes the lints of the workspace through
  `[lints] workspace = true`, the attributes of `src/lib.rs` are in the form that binding scaffold writes, the Go and
  WASM crates name `polyspec-http-media-type`, and the PHP crate has `build.rs`, which tells the macOS linker to leave
  the symbols of PHP undefined for its library alone, with `test = false` and `doctest = false` in `[lib]`.
  `.cargo/config.toml` is removed: it gave the same link setting to every crate of the workspace, the test executables
  of the core included. The Node addon takes it from `napi_build::setup()` of its `build.rs`. Before, `make
  bindings-check` with the pinned binding reported CK-19 for each crate. `cargo fmt --all --check` (`make fmt-check`)
  fails on the four `src/lib.rs` files that binding scaffold writes, because `rustfmt.toml` sets `use_small_heuristics
  = "Max"`, which puts each attribute on one line, and binding writes the attributes in the form of the default width.

- The contract case of the group internal on the WASM binding (`packages/ts/tests/cases.wasm.test.mjs`) arms its
  faults through `__armFaults` and `__faultLeft` of the module that wasm-bindgen writes, as the generated tests do
  (binding GN-5). It looked for them on the module of the subpath `./wasm`, which does not export them, so `make
  test-wasm` failed the case `a_broken_index_is_internal` with "the module has no entry point that arms faults".

- `make bindings`, `make bindings-check` and the install of `node_modules` run the Node.js and the npm of `var/tools`
  (`$(NODE)` and `$(NPM)` of the Makefile). make runs a recipe line without shell syntax through the `PATH` of its own
  environment and not through the `PATH` that the Makefile exports, so `npm ci` ran the npm of the machine, which
  refuses the npm 12.2.0 of `devEngines` (`EBADDEVENGINES`) and failed `make check-declarations` in a checkout without
  `node_modules`, and `scripts/binding.mts` ran on the Node.js of the machine instead of Node.js 26.12.0.

- The tools are pinned and installed into `var/tools` of the checkout as in binding: `mise.toml` and `mise.lock` pin
  Node.js 26.12.0, npm 12.2.0, Go 1.27.3, Python 3.14.8, Composer 2.10.3 and the wasm-bindgen CLI 0.2.130 with the
  digests of binding, `config/toolchain.json` pins mise 2026.10.10, `.php-version` names PHP 8.4, and
  `rust-toolchain.toml` adds the target `wasm32-unknown-unknown`. The new `package.json` names npm 12.2.0 in
  `devEngines`, TypeScript 7.0.2 and `@polyspec/kit` 0.0.109, whose installers `make bootstrap`, `make install`, `make
  install-tools`, `make install-packages` and `make toolchain-lock` run, as the recipes of binding do. Every recipe
  runs with `var/tools/bin` and the shims of mise first on `PATH`, and `GO`, `GOFMT`, `WASM_BINDGEN`, `PHP` and
  `PHP_CONFIG` name the tools of `var/tools`. Before, every recipe ran the tools that the `PATH` of the machine named, at no pinned release.

- `make test-bindings` builds and tests every target of the contract (binding BD-27): `make test-python`, `make
  test-node`, `make test-wasm`, `make test-php` and `make test-go` each run the tests that binding generates and the
  new contract cases of the binding on the standard runner of its language: `packages/python/tests/test_cases.py` on
  unittest, `packages/ts/tests/cases.test.mjs` and `packages/ts/tests/cases.wasm.test.mjs` on node --test (the WASM
  binding through the subpath `./wasm` of the installed package, the module written by the wasm-bindgen CLI in the
  step `node-package` that both share), `packages/php-ext/tests/CasesTest.php` on PHPUnit and
  `packages/go/tests/cases_test.go` on go test, with the Go of the go directive of `packages/go/go.mod` and
  `GOTOOLCHAIN=local`. Each runner takes every case of the groups `accept`, `weigh`, `invalidCandidates` and `internal`
  of `contracts/negotiate.json` and compares its ranges, its weights or its `raises`; a case of `internal` arms its
  faults for `accept.weigh` and fails when a fault did not fire, and the Go and WASM runners fail it, because those
  bindings have no entry point that arms faults. The Python, Node, PHP and WASM crates are built and linted with the
  features `panic-test` and `fault-test` (`TEST_FEATURES`), because the contract has a fault injection point (binding
  GN-5). `make check-declarations` checks the declarations of the Node and the
  WASM binding with the TypeScript of `package.json`. `make test-python` installs the wheel `HTTP_MEDIA_TYPE_WHEEL` and
  `make test-php` loads the extension `HTTP_MEDIA_TYPE_EXTENSION` of http-media-type, whose record `Parameter` a range
  holds. `make fmt-check` runs `cargo fmt --all --check` on the whole workspace instead of the core alone, `make
  lint-rust` is clippy of the core, `make lint` runs both, and `make test` runs the tests of the core. PHPUnit is a
  dependency of `composer.json`, pinned by `composer.lock`, and `.cargo/config.toml` leaves the symbols of the PHP and
  the Node runtime undefined on macOS. `.gitignore` names `packages/ts/wasm/generated/` and
  `packages/go/internal/ffi/generated/`, so the Go files `zz_generated_*.go` that `make bindings` writes are tracked
  (binding GN-3). Before, no make target built or tested a binding of this repository. The pinned binding refuses to
  generate the contract (G-4), because it does not generate the entry points of the feature fault-test for Go and
  WASM, so `make bindings` writes no file, no Go file is generated to track, and every target of `make test-bindings`
  fails with that cause. `make fmt-check` fails on `packages/go/internal/ffi/src/lib.rs`, the line of 125 characters
  that binding scaffold writes.

- The end-to-end check of binding (GN-14) builds and tests the bindings of this contract on each
  target, with http-media-type as the repository whose record `parameter` the contract names. PHP passes 94 generated
  tests on PHPUnit, Python 94 on unittest and Node 95 on `node --test`, none failed or skipped. Go and WASM fail at
  generation, refused by name (G-4): for both, the entry points of the feature `fault-test` (G-5) and the record
  `http-media-type.parameter` of another repository; for Go also the class unit `accept`. The generated tests run the
  cases that raise (B-4) and compare no result of a case (binding GN-13a), and binding holds no case runners of this
  library (V-1), so the 71 cases that do not raise are checked by the core tests alone. The binding packages lack
  `build.rs` of `packages/php-ext` (BD-9), which binding scaffold of that commit writes; `Cargo.lock` pins the binding at
  the head of its branch, and takes that file with the pin of a later commit. `AGENTS.md` and `README.md`
  state that the end-to-end check of binding builds and tests the bindings.

- The case `a_broken_index_is_internal` is in its own group `internal`, which only the member `accept.weigh` reads
  (a row of `cases` of `packages/rust/interface.json`). In the group `weigh` the member `accept.parse` read it too: its
  generated test armed the point for `parse`, which never reaches it, and expected the kind `internal` that `parse`
  does not raise, so the Node test of `Accept.parse` failed in the end-to-end check of binding.

- The kind `internal` has its case (binding CK-22, X-1). No input reaches it, so the core marks the fault injection
  point `http_negotiation.internal` (`fault::INTERNAL`) in `Accept::weigh`, where the index of the deciding range is
  converted to the integer of the interface, and the contract names it in `faults` (inject `broken`, fills
  `internal`). The case `a_broken_index_is_internal` of the group `weigh` arms the point and raises the kind
  `internal`; `tests/contracts.rs` arms it as a generated binding test does and fails a fault that did not fire. The
  core has the feature `fault-test`, which turns on that of `polyspec-binding-core`, and the binding crates of Python,
  Node and PHP turn it on, as binding scaffold writes; the core tests turn it on through the dev-dependency on
  `polyspec-binding-core`. The spec states the point and its table in NG-11.4. `make bindings-check` passes with no
  finding. `make bindings` refuses the contract by name: the pinned generator writes no fault-test entry points for
  Go and WASM yet (G-5).

- The check of the candidate values no longer returns `internal` for a slice of the earlier values that cannot fail:
  the values before the current one are read with `take`, so `internal` comes from the index of the deciding range
  alone, as the table of NG-11 states.

- The contract names the five targets of binding (BD-27): `targets` of `packages/rust/interface.json` is php, python,
  node, go and wasm, `packages.go` names the Go module `github.com/polyspec/http-negotiation/packages/go`, the entry `.`
  of the npm package takes the conditions `{node: napi, browser: wasm}`, each error class names its WASM class, the
  Node one, and `errors.fixed` names `TypeError` for WASM as for Node. Before, the contract named php, python and
  node, so no Go or WASM binding was generated. The tracked binding packages gain what binding scaffold writes for the
  two targets (`packages/go/go.mod`, `packages/go/internal/ffi`, `packages/ts/wasm`, the browser exports of
  `packages/ts/package.json`), and both crates are members of the workspace. The contract check keeps the one finding
  that it had before this change: CK-22, no case arms the point `http_negotiation.internal` as broken for the kind
  `internal` (X-1). No make target builds or tests the Go and WASM bindings yet. `make fmt-check` fails on
  `packages/go/internal/ffi/src/lib.rs`: binding scaffold writes its `allow` attribute in one line of 125 characters,
  beyond `max_width = 120` of `rustfmt.toml`, and the file is not edited by hand.

- `Cargo.lock` pins the binding whose generator holds the value aliases, the fault injection and the error units in one
  line of development (CK-20), and the binding packages are those that its scaffold writes: each binding crate takes
  `polyspec-binding-core` with the features `construct` and `lock`, and the lock gains `tokio` as a dependency of
  `polyspec-binding-core`. `make bindings-check` still fails with one finding of CK-22, and `make bindings` writes
  nothing because of it: the check now requires one case that arms the fault injection point `http_negotiation.internal`
  as `broken` and raises a kind of the category `internal`. The contract declares no fault injection point and the core
  has none.

- Every tracked document is an English file and its Korean twin: `AGENTS.ko.md` and `docs/spec/negotiate.ko.md` are
  added, `README.md` and `CHANGELOG.md` begin with the marker `doc-id`, and each Korean file holds the same `doc-id`
  and `source-sha256`, the sha256 of its English file.

- `scripts/binding.mts` clones the checkout that Cargo made of the pinned binding commit into `var/binding/<commit>`
  and no longer copies its files. `binding check` reads its own commit from its Git checkout and compares it with the
  commit of `Cargo.lock` (CK-20); with a copy of the files it found no commit, and `make bindings-check` failed.

- `Cargo.lock` pins binding at the commit that every repository of the library family pins (CK-20), and the
  commit of `polyspec-http-media-type` on it; the binding packages are those that its scaffold writes, and the Node
  package has one optional dependency per platform package of the addon.
