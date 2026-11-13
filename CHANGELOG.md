<!-- doc-id: changelog -->

## Unreleased

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

- The end-to-end check of binding (GN-14) at the commit 8faad21 builds and tests the bindings of this contract on each
  target, with http-media-type as the repository whose record `parameter` the contract names. PHP passes 94 generated
  tests on PHPUnit, Python 94 on unittest and Node 95 on `node --test`, none failed or skipped. Go and WASM fail at
  generation, refused by name (G-4): for both, the entry points of the feature `fault-test` (G-5) and the record
  `http-media-type.parameter` of another repository; for Go also the class unit `accept`. The generated tests run the
  cases that raise (B-4) and compare no result of a case (binding GN-13a), and binding holds no case runners of this
  library (V-1), so the 71 cases that do not raise are checked by the core tests alone. The binding packages lack
  `build.rs` of `packages/php-ext` (BD-9), which binding scaffold of that commit writes; `Cargo.lock` pins the binding
  f63a655, the head of its branch, and takes that file with the pin of a later commit. `AGENTS.md` and `README.md`
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

- `Cargo.lock` pins binding at 9de9d03, the commit that every repository of the library family pins (CK-20), and the
  commit of `polyspec-http-media-type` on it; the binding packages are those that its scaffold writes, and the Node
  package has one optional dependency per platform package of the addon.
