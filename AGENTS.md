<!-- doc-id: agents -->
# Development

The working principles of every polyspec repository are in `PRINCIPLES.md` of polyspec; this file states only the
rules of this repository.

## Scope

- This library reads media ranges and the `Accept` field of HTTP and weighs a list of candidates
  (`docs/spec/negotiate.md`, NG-1 to NG-12). Media types, the grammar of tokens, quoted strings and parameters and the
  comparison of parameter values belong to the dependency http-media-type (`polyspec-http-media-type`, rules `MT-n`):
  the spec points to its rules and the code reads that grammar through its module `grammar`, never a copy of it. Which candidates exist, which one is taken, the order of equal weights and
  the response to a request that matches none are decisions of the caller and have no rule here (NG-10.4).

## Rules and order of work

- The rules are the statements of `docs/spec/negotiate.md`. A change of a rule changes the spec first, then the cases
  of `contracts/negotiate.json`, then the code. Every case and every test names the statements that it checks, and
  `tests/contracts.rs` fails a statement that no case or test cites and a citation of no statement.
- A statement keeps its id only while its meaning stays; a change of meaning retires the id and adds a new statement.
- A text of `contracts/negotiate.json` is bytes, one character per byte (U+0000 to U+00FF). A failure is the object
  `raises` with `kind`, `status`, `category` and `message`, and a case that fails has no result key.
- A case follows the case convention of binding (G-5): its keys are the parameter names of its member in snake_case,
  and a record is the object of its fields, such as a candidate of `candidates` and a parameter `{"name", "value"}`.
- Every rule is in the Rust core `packages/rust`. A binding converts types and holds no rule; the bindings are
  generated from the interface contract `packages/rust/interface.json` and are not written by hand. The contract is
  in the crate package (`include` of `packages/rust/Cargo.toml`), so that a repository that depends on the crate reads
  it through Cargo, as this contract reads the contract of http-media-type.
- An input that changes no result is a row of the table "Inputs ignored" of the spec, with its standard clause and a
  case that shows it. An input ignored without such a row is a defect.
- A record of this repository (spec, comment, test, changelog, commit message) states rules and their reasons by rule
  id and standard clause. It names no source of a rule and no person who decided it.

## Rust

- `rust-toolchain.toml` pins the toolchain and `Cargo.lock` the dependencies. `polyspec-http-media-type` is a Git
  dependency on the branch `v1/rust-core` of its repository, whose commit `Cargo.lock` pins, as `polyspec-binding-core`
  is; the build reads no other checkout.
- The workspace lints deny every warning, unsafe code, `unwrap`, `expect`, `as` conversions and discarded results;
  `clippy.toml` disallows the methods that turn a failure or an absence into a value (`Option::unwrap_or` and its
  family, `Result::ok`, `map_or`, `map_or_else`). A use that a rule needs carries `#[allow(..., reason = "<rule id>")]`.
- No function performs I/O, keeps state or waits (NG-12).

## Bindings

- The repository is one Cargo workspace: the core `packages/rust` and the binding crates of the five targets
  (binding BD-27) `packages/python`, `packages/ts`, `packages/ts/wasm`, `packages/php-ext` and
  `packages/go/internal/ffi` (with `packages/go/go.mod`), which `binding scaffold` writes and `make bindings-check`
  compares; their `generated/` is not tracked. `Cargo.lock` at the root pins every dependency.
- `polyspec-binding-core` is a Git dependency of the core and of the binding crates (branch `v1/rust-core` of the
  binding repository) until binding is released; `Cargo.lock` pins its commit. The core implements
  `binding_core::Kinds` for its error (NG-11).
- `scripts/binding.mts` runs binding from a clone, in `var/binding/<commit>`, of the checkout that Cargo made of the
  commit that `Cargo.lock` pins, so that the generator and `binding_core` are one version, until binding is released.
  The clone is a Git checkout of binding at that commit: binding check reads its own commit from it and compares it with
  the commit of `Cargo.lock` (CK-20), which a copy of the files alone fails. `make bindings` generates every target at
  once; the pinned binding refuses the contract for Go and WASM by name (G-4), so it writes nothing.
- The bindings are built and tested by the end-to-end check of binding (`make e2e` of binding, GN-14), which generates,
  builds and tests each of the five targets on its own on the standard runner of its language and names each target
  that fails with its causes. No make target of this repository builds or tests a binding, and a target that the
  generator refuses stays a failure of that check, never left out of `targets`.

## Checks

- `make test` runs the contract cases, the citation checks, the random tests and the runtime properties of the core.
- `make lint` runs `cargo fmt --check` and clippy of the core with every warning denied; `make check` runs both and
  `make bindings-check`.

## Commits and changes

- A commit message is `type(scope): Subject` with a type of feat, fix, docs, style, refactor, test or chore, a Subject
  of at most 50 characters that starts with a capital letter and ends without a period, a blank line and a body
  wrapped at 72 characters.
- A behavior change, its spec, its cases and its entry under `## Unreleased` of `CHANGELOG.md` and `CHANGELOG.ko.md`
  are one change.
