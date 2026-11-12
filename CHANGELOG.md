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
