
- The repository is http-negotiation: a repository is named after what it handles, a noun, with the prefix `http-` for
  a part of an HTTP message (plan N-1, N-2). Every name follows it (design P-1, E-2): the crate
  `polyspec-http-negotiation`, the Composer package `polyspec/http-negotiation` with the namespace
  `Polyspec\HttpNegotiation` and the extension `polyspec_http_negotiation`, the PyPI package `polyspec-http-negotiation`
  with the module `polyspec.http_negotiation`, the npm package `@polyspec/http-negotiation` and the error classes
  `HttpNegotiation<Category>Error`. The contract records the change in `changes`.
- `polyspec-http-media-type` is a Git dependency on the branch `v1/rust-core`, whose commit `Cargo.lock` pins, instead of
  a path dependency on the checkout next to this one, so that the build reads no working tree of another repository.
