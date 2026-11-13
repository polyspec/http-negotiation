<!-- doc-id: changelog -->
<!-- source-sha256: bf9b58f2a65fd282377fdcf54788b888334c6ac33502a01a965da02b0a364fe8 -->

- 계약이 binding의 다섯 target을 적는다(BD-27): `packages/rust/interface.json`의 `targets`는 php, python, node,
  go, wasm이고, `packages.go`는 Go 모듈 `github.com/polyspec/http-negotiation/packages/go`를 적으며, npm 패키지의 entry
  `.`는 조건 `{node: napi, browser: wasm}`을 받고, 각 오류 클래스는 WASM 클래스로 Node의 것을 적으며,
  `errors.fixed`는 Node처럼 WASM에도 `TypeError`를 적는다. 전에는 계약이 php, python, node만 적어 Go와 WASM 바인딩이
  생성되지 않았다. 추적되는 바인딩 패키지에 binding scaffold가 두 target을 위해 쓰는 것(`packages/go/go.mod`,
  `packages/go/internal/ffi`, `packages/ts/wasm`, `packages/ts/package.json`의 브라우저 exports)이 더해지고, 두
  crate가 workspace의 member가 된다. 계약 검사는 이 변경 전에 있던 finding 하나를 그대로 낸다: CK-22, kind
  `internal`을 위해 점 `http_negotiation.internal`을 broken으로 켜는 case가 없다(X-1). Go와 WASM 바인딩을 빌드하거나
  시험하는 make target은 아직 없다. `make fmt-check`는 `packages/go/internal/ffi/src/lib.rs`에서 실패한다: binding
  scaffold가 그 `allow` 속성을 125자의 한 줄로 쓰는데 `rustfmt.toml`의 `max_width = 120`을 넘고, 이 파일은 손으로
  고치지 않는다.

- `Cargo.lock`은 값 alias, 실패 주입, 오류 unit의 생성기를 한 개발 줄기에 가진 binding을 고정하고(CK-20), 바인딩
  package는 그 scaffold가 쓰는 것이다. 각 바인딩 crate는 `polyspec-binding-core`를 feature `construct`와 `lock`과 함께
  받고, lock에는 `polyspec-binding-core`의 의존으로 `tokio`가 더해진다. `make bindings-check`는 여전히 CK-22 지적
  하나로 실패하고, 그 때문에 `make bindings`는 아무것도 쓰지 않는다. 검사는 이제 실패 주입점
  `http_negotiation.internal`을 `broken`으로 장전하고 category `internal`의 kind를 내는 case 하나를 요구한다. 계약은
  실패 주입점을 선언하지 않고 코어에도 없다.

- 추적하는 모든 문서는 영어 파일과 그 한국어 쌍이다. `AGENTS.ko.md`와 `docs/spec/negotiate.ko.md`를
  더했고, `README.md`와 `CHANGELOG.md`는 marker `doc-id`로 시작하며, 각 한국어 파일은 같은 `doc-id`와
  영어 파일의 sha256인 `source-sha256`을 가진다.

- `scripts/binding.mts`는 Cargo가 고정 커밋으로 만든 binding checkout을 `var/binding/<commit>`에 clone하며,
  더 이상 그 파일을 복사하지 않는다. `binding check`는 자기 Git checkout에서 자기 커밋을 읽어 `Cargo.lock`의 커밋과 비교한다(CK-20). 파일
  복사본에서는 커밋을 찾지 못해 `make bindings-check`가 실패했다.

- `Cargo.lock`은 같은 라이브러리 묶음의 모든 레포가 고정하는 binding 9de9d03과 그 위의 `polyspec-http-media-type` 커밋을
  고정한다(CK-20). 바인딩 package는 그 scaffold가 쓰는 것이며, Node 패키지는 addon의 플랫폼 패키지마다 optional
  dependency를 가진다.
