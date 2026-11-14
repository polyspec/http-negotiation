<!-- doc-id: plan-rust-core -->
# Rust core

[한국어](plan.ko.md)

http-negotiation reads the media ranges of an `Accept` header and weighs candidates against them by the rules of
[the specification](../../spec/negotiate.md). Every rule is written once, in the Rust crate `polyspec-http-negotiation`
of `packages/rust`, and tested once, by the cases of `contracts/negotiate.json`. The packages of PHP, Python, Node, the
browser (WASM) and Go hold no code of their own: binding generates each of them from the interface contract
`packages/rust/interface.json`, and binding scaffold writes their binding crates, so a rule never has a second copy that
can differ from the first.

The checklist follows the order in which each step needs the one before it:

1. The specification and its cases (T1.1), then the core that passes them (T1.2).
2. The interface contract of the core for the five targets of binding, with a case for every kind (T1.3).
3. One Cargo workspace with the core and the binding crates that binding scaffold writes, pinned to one commit of
   binding (T1.4).
4. The bindings that binding generates, each tested by the tests that binding generates and by the contract cases on
   the standard runner of its language (T1.5), and the end-to-end check of binding on this repository (T1.6).
5. The Go binding (T1.7): binding generates Go for this contract, and the Go binding imports the Go module of
   http-media-type, so its test builds that module and its static library from the checkout of http-media-type.
6. The checks on GitHub and the release: the workflows `ci` and `release`, the release configuration and their make
   targets (T1.8), then the first release (T1.9), which waits for a release of http-media-type that holds its wheel and
   its PHP extension, and for the Go binding (T1.7).
7. The dependency on binding by its released tag in place of its branch (T1.13), which waits for the release of binding
   0.0.2, and the packages of the bindings per platform (T1.14): binding generates their release recipes, so this
   repository writes none of its own. Both come before the first release (T1.9).
