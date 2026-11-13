<!-- doc-id: readme -->
# http-negotiation

[한국어](README.ko.md)

Media ranges and the `Accept` field of HTTP (RFC 9110, sections 12.4.2 and 12.5.1), and the weight that an `Accept`
field gives each candidate media type of a list. Media types and the grammar of their parameters are the library
http-media-type, on which this one depends.

- `Accept::parse(lines)` reads the field lines of `Accept` into ranges with weights in thousandths; no line is `*/*`.
- `Accept::weigh(candidates)` gives each candidate the weight of the range that decides it and that range's index.

The library chooses no candidate: the caller decides which candidates exist, which one it takes and what it answers
when none is acceptable. Every failure is an error with a kind (`invalid_accept`, `invalid_weight`,
`invalid_candidate`).

The rules are in [docs/spec/negotiate.md](docs/spec/negotiate.md), the cases in
[contracts/negotiate.json](contracts/negotiate.json) and the public API of the bindings in
[packages/rust/interface.json](packages/rust/interface.json), which the crate package holds. The core is the Rust crate in
`packages/rust`; the PHP, Python and Node bindings are generated from the interface contract and do not exist yet.

```sh
make test
make lint
```
