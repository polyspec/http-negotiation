# Changelog

[한국어](CHANGELOG.ko.md)

## Unreleased

- Add the spec NG-1 to NG-12: `Accept` and qvalues (RFC 9110, sections 12.4.2 and 12.5.1), the parameters of a media
  range, which are those of the dependency http-media-type (MT-3), the matching of a range to a candidate with the
  comparison of values of MT-5, the range that decides a weight, the error kinds and the table of inputs ignored.
- Add the contract cases `contracts/negotiate.json` (groups `accept`, `weigh`, `invalidCandidates`).
- Add the Rust core `polyspec-http-negotiate` with `Accept::parse`, `Accept::ranges` and `Accept::weigh`, which reads
  media ranges with the grammar of `polyspec-http-media-type`, its contract, citation, random and runtime tests, and the
  lints that deny `unwrap`, `expect` and the methods that turn a failure or an absence into a value.
- Add the draft interface contract `contracts/interface.json` for the PHP, Python and Node bindings; a range holds the
  `parameter` record of http-media-type.
- Move the interface contract to `packages/rust/interface.json` and add it to the `include` of the crate, so that a
  repository that depends on the crate reads the contract from the package that Cargo resolved; the contract of
  http-media-type is read the same way. The category error classes are named `Negotiate<Category>Error` in every
  language (`NegotiateValueError` and so on), apart from the built-in classes such as Python `ValueError`.
- The contract drops the error class `NegotiateError`, which held every kind of the category `value` and no property:
  a failure of reading or weighing is a `NegotiateValueError` with its kind. The Python module is
  `polyspec.http_negotiate`, the one form of the package names of polyspec.
- The repository is one Cargo workspace with the binding crates `packages/python`, `packages/ts` and `packages/php-ext`
  that `bindgen scaffold` writes. The core depends on `polyspec-bindgen-core` and implements `Kinds` for its error, and
  `make bindings-check` checks the contract and the binding packages. The bindings are not generated yet.
