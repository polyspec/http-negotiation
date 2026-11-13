<!-- doc-id: changelog -->

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
