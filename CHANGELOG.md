# Changelog

[한국어](CHANGELOG.ko.md)

## Unreleased

- Add the spec NG-1 to NG-12: media types (RFC 9110, section 8.3.1), parameters and quoted strings (5.6.4, 5.6.6),
  `Accept` and qvalues (12.4.2, 12.5.1), the matching of a range to a candidate, the range that decides a weight, the
  error kinds and the table of inputs ignored.
- Add the contract cases `contracts/negotiate.json` (groups `accept`, `mediaType`, `weigh`, `invalidCandidates`).
- Add the Rust core `polyspec-http-negotiate` with `parse_media_type`, `Accept::parse`, `Accept::ranges` and
  `Accept::weigh`, its contract, citation, random and runtime tests, and the lints that deny `unwrap`, `expect` and the
  methods that turn a failure or an absence into a value.
- Add the draft interface contract `contracts/interface.json` for the PHP, Python and Node bindings.
