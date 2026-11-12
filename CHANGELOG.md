
- The repository depends on `polyspec-binding-core` of the repository binding (`binding_core`, the Git dependency
  `https://github.com/polyspec/binding.git`, which `Cargo.lock` pins), the new name of bindgen, and runs its tool with
  `scripts/binding.mts`; the binding packages are those that `binding scaffold` writes, and `Cargo.lock` takes the
  commit of `polyspec-http-media-type` that depends on the same crate. The Python error classes are
  `HTTPNegotiation<Category>Error`, the class form of the repository name in Python (design N-2: an acronym word is all
  capitals in Python and one capital word in PHP and Node, which keep `HttpNegotiation<Category>Error`).
- The cases follow the case convention of binding (G-5): a case of `weigh` holds its candidates as record objects, a
  case of `invalidCandidates` holds the list `candidates` (a valid candidate, then the invalid one), and a parameter of
  a range is `{"name", "value"}`. The named candidates of the file are gone.
