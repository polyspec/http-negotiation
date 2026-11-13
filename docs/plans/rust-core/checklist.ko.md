<!-- doc-id: checklist-rust-core -->
<!-- source-sha256: d9fd4be26b753a9d150bc9fc568ea7e512f5d4fbe04cb107072ac131ea69448b -->
# Rust 코어 체크리스트

| ID | Task | Deliverables | Verification | State |
|---|---|---|---|---|
| T1.1 | media type, `Accept`, 무게와 NG-1부터 NG-11까지의 case를 정의한다 | `docs/spec/negotiate.md`, `contracts/negotiate.json` | `make test` | [o] |
| T1.2 | 규칙을 Rust crate polyspec-http-negotiation으로 쓴다. media range는 http-media-type으로 읽고, 모든 실패에 error kind를 준다 | `packages/rust` | `make test`, `make lint-rust` | [o] |
| T1.3 | binding의 다섯 target을 위한 인터페이스 계약을 crate에 담아 쓰고, kind마다 case를 둔다. kind internal은 코어의 결함 주입점으로 낸다 | `packages/rust/interface.json`, `packages/rust/src/candidate.rs`, `packages/rust/Cargo.toml` | `make bindings-check` | [o] |
| T1.4 | 코어와 binding scaffold가 쓰는 바인딩 crate를 binding의 한 commit에 고정된 하나의 workspace에 둔다 | `Cargo.toml`, `Cargo.lock`, `packages/php-ext`, `packages/python`, `packages/ts`, `packages/ts/wasm`, `packages/go`, `scripts/binding.mts` | `make bindings-check` | [o] |
| T1.5 | PHP, Python, Node, WASM 바인딩을 binding이 생성하는 시험과 contract case로 각 언어의 표준 runner에서 시험한다. 각 target은 자기 `make bindings-<target>`이 생성한다 | `packages/php-ext/tests`, `packages/python/tests`, `packages/ts/tests`, `Makefile` | `make test-php`, `make test-python`, `make test-node`, `make test-wasm` | [o] |
| T1.6 | 이 저장소에 대한 고정된 binding의 end-to-end 검사를 php, python, node, wasm에서 통과한다 | binding의 추적되지 않는 `var/report/e2e/http-negotiation.json` | binding의 `make e2e` | [o] |
| T1.7 | Go 바인딩을 binding이 생성하는 시험과 `packages/go/tests`의 contract case로 시험한다 | `packages/go` | `make test-go` | [!] 원인: binding이 계약의 Go 생성을 거부한다(G-4). Go의 feature fault-test 진입점, class unit, 다른 저장소의 record를 아직 생성하지 않는다; 재시도: binding이 packages/rust/interface.json의 Go를 생성한다 |
| T1.8 | GitHub에서 검사를 실행하고 tag를 release한다: workflow `ci`와 `release`, release 구성, 그 make target | `.github/`, `config/release.json`, `Makefile` | `make release-coverage` | [o] |
| T1.9 | `main`에서 `ci.yml`의 모든 job을 통과하고, Go module의 tag `packages/go/vX.Y.Z`와 바인딩의 package를 갖춘 첫 version을 release한다. 선행 조건: tag `vX.Y.Z`, Go module의 tag, wheel, PHP 확장을 가진 http-media-type의 release(job `bindings`의 `make test-python`과 `make test-php`가 그 wheel과 확장을 읽는다); 코어의 http-media-type 의존 줄을 `tag = "vX.Y.Z"`로 두는 것(Go 바인딩에 필요하다, binding GN-15f); T1.7의 Go 바인딩; T1.10; `config/release.json`의 package 행을 위한 kit 0.0.111과 binding의 release. release는 `main`이 없는 `origin`에 `v1/rust-core`를 `main`으로 push하고 `main`을 기본 브랜치로 만든다 | `main`의 CI 실행, release의 tag | `make ci-passed` | [ ] |
| T1.10 | `make fmt-check`를 통과한다. 고정된 binding은 binding crate의 `src/lib.rs`의 allow 속성을 여러 줄로 쓰고, 이 저장소의 `rustfmt.toml`을 쓰는 rustfmt는 그것을 거부한다. scaffold가 속성을 한 줄로 쓰는 binding을 고정하고 binding crate를 다시 쓴다 | `Cargo.lock`, `packages/*/src/lib.rs` | `make fmt-check` | [ ] |
| T1.11 | 추적 파일에 Git commit을 적지 않는다: changelog와 checklist에는 사실을 적고, 규칙을 `AGENTS.md`에 두고 검사한다 | `CHANGELOG.md`, `docs/plans/rust-core/checklist.md`, `AGENTS.md`, `tests/scripts/commits.test.mts` | `make test-scripts` | [ ] |
