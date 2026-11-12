# The tasks of this repository. The Rust toolchain is the one that rust-toolchain.toml pins.
CARGO := cargo
# Extra arguments of every cargo build, for example --ignore-rust-version on a machine without the pinned release.
CARGOFLAGS ?=
CORE := polyspec-http-negotiate
BINDGEN := node scripts/bindgen.mts

.PHONY: check test lint test-rust lint-rust bindings bindings-check

# The core and the contract; none of them needs the generator (bindgen design L-2).
check: lint test bindings-check

test: test-rust

lint: lint-rust

# The contract cases, the rule citations, the random tests and the runtime properties (NG-1 to NG-12) of the core; the
# binding crates of the workspace include the sources that make bindings writes, so the core is named (-p).
test-rust:
	$(CARGO) test $(CARGOFLAGS) -p $(CORE) --locked

# R-1 lints of Cargo.toml and clippy.toml; every warning fails.
lint-rust:
	$(CARGO) fmt -p $(CORE) --check
	$(CARGO) clippy $(CARGOFLAGS) -p $(CORE) --locked --all-targets -- -D warnings

# The contract check and the comparison of the tracked binding packages with what bindgen scaffold writes (L-2).
bindings-check:
	$(BINDGEN) check packages/rust/interface.json

# Writes the generated sources into packages/{php-ext,python,ts}/generated, which are not tracked (G-6, L-1).
bindings:
	$(BINDGEN) generate --root .
