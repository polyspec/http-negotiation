<!-- doc-id: checklist-rust-core -->
<!-- source-sha256: 4a47046776410603c6bfb3db689b44df1f7f56b44a6f4c83dfa75e5c5c6ada31 -->
# Rust 코어 체크리스트

| ID | Task | Deliverables | Verification | State |
|---|---|---|---|---|
| T1.1 | media type, `Accept`, 무게와 NG-1부터 NG-11까지의 case를 정의한다(4b091bf, 924321d, 03708b4) | `docs/spec/negotiate.md`, `contracts/negotiate.json` | `make test` | [o] |
| T1.2 | 규칙을 Rust crate polyspec-http-negotiation으로 쓴다. media range는 http-media-type으로 읽고, 모든 실패에 error kind를 준다(23203cf, 29dba96, 7646bcd, f42f629, 7188c82, 42e358b) | `packages/rust` | `make test`, `make lint-rust` | [o] |
| T1.3 | binding의 다섯 target을 위한 인터페이스 계약을 crate에 담아 쓰고, kind마다 case를 둔다. kind internal은 코어의 결함 주입점으로 낸다(6b361cb, 9753b4a, 9bc0918, dc53b27, 9666ab8, 75de7ed, aa9cd5c) | `packages/rust/interface.json`, `packages/rust/src/candidate.rs`, `packages/rust/Cargo.toml` | `make bindings-check` | [o] |
| T1.4 | 코어와 binding scaffold가 쓰는 바인딩 crate를 binding의 한 commit에 고정된 하나의 workspace에 둔다(b9da4ea, e4aedab, 61b6f1e, cb12ba4, c7b7569, 44dd52c, 75de7ed) | `Cargo.toml`, `Cargo.lock`, `packages/php-ext`, `packages/python`, `packages/ts`, `packages/ts/wasm`, `packages/go`, `scripts/binding.mts` | `make bindings-check` | [o] |
| T1.5 | PHP, Python, Node, WASM 바인딩을 binding이 생성하는 시험과 contract case로 각 언어의 표준 runner에서 시험한다. 각 target은 자기 `make bindings-<target>`이 생성한다(82d1345, 345da81, 71b540f, 0c48818) | `packages/php-ext/tests`, `packages/python/tests`, `packages/ts/tests`, `Makefile` | `make test-php`, `make test-python`, `make test-node`, `make test-wasm` | [o] |
| T1.6 | 이 저장소에 대한 binding 49a4e97의 end-to-end 검사를 php, python, node, wasm에서 통과한다(ad64dad, aa9cd5c) | binding의 추적되지 않는 `var/report/e2e/http-negotiation.json` | binding의 `make e2e` | [o] |
| T1.7 | Go 바인딩을 binding이 생성하는 시험과 `packages/go/tests`의 contract case로 시험한다 | `packages/go` | `make test-go` | [!] 원인: binding이 계약의 Go 생성을 거부한다(G-4). Go의 feature fault-test 진입점, class unit, 다른 저장소의 record를 아직 생성하지 않는다; 재시도: binding이 packages/rust/interface.json의 Go를 생성한다 |
| T1.8 | GitHub에서 검사를 실행하고 tag를 release한다: workflow `ci`와 `release`, release 구성, 그 make target | `.github/`, `config/release.json`, `Makefile` | `make release-coverage` | [ ] |
| T1.9 | `main`에서 `ci.yml`의 모든 job을 통과하고 첫 version을 release한다. job `bindings`에는 wheel과 PHP 확장을 가진 http-media-type의 release와 T1.7의 Go 바인딩이 필요하다 | `main`의 CI 실행, release의 tag | `make ci-passed` | [ ] |
