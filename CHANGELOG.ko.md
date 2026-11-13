<!-- doc-id: changelog -->
<!-- source-sha256: 5bd7c651cf76827be1614dc03117dd020c750a5ee504ac1e91cabfc3af70cfbd -->

## Unreleased

- core의 시험이 feature `fault-test`를 켠 core 자신에 의존한다(`packages/rust/Cargo.toml`의 `[dev-dependencies]`). 그래서
  `cargo test -p polyspec-http-negotiation`은 flag 없이 case `a_broken_index_is_internal`의 결함 주입점을 걸고, `make
  test`는 feature를 넘기지 않는다. 전에는 binding 49a4e97의 주입점이 그것을 쓰는 crate의 feature로만 살아 있으므로(binding
  GN-5), binding의 end-to-end 검사가 실행하는 core의 `cargo test`가 그 case를 "the faults of http_negotiation.internal did
  not fire"로 실패시켰다.

- `make bindings`가 계약의 각 target을 자기 target `make bindings-<target>`(`binding generate --target <target>`)에서
  생성하고, 각 바인딩 target은 그것에 의존한다. `make test-python`은 `bindings-python`에, `make node-package`와 `make
  check-declarations`는 `bindings-node`와 `bindings-wasm`에, `make test-php`는 `bindings-php`에, `make test-go`는
  `bindings-go`에 의존한다(binding GN-1c). 전에는 `make bindings`가 모든 target을 한 번에 생성했으므로, binding 49a4e97이
  상태 1로 끝내는 go의 거부가 binding이 생성하는 php, python, node, wasm의 target을 멈췄다. `AGENTS.md`와 `README.md`는
  binding이 그 넷을 생성하고 go를 거부한다고 적는다.

- `Cargo.lock`이 `polyspec-binding-core`를 binding의 commit 49a4e97로 고정한다. 그 commit의 결함 주입점은 macro
  `binding_core::fault::point!`이며, 그것을 쓰는 crate의 feature `fault-test`로 판정된다(binding GN-5).
  `packages/rust/src/candidate.rs`의 주입점은 `point!(crate::fault::INTERNAL)`이고, `make test`는 core의 시험을 그
  feature `fault-test`와 함께 실행한다. contract 시험이 주입점을 걸려면 그 feature가 필요하다. `make lint-rust`는 core를
  그 feature가 있을 때와 없을 때 모두 lint한다. 전에는 core가 함수 `fault::point`이 없는 binding 49a4e97로 컴파일되지 않았다.

- `Cargo.lock`이 `polyspec-binding-core`를 binding의 commit 1bf0025로 고정하고, 바인딩 crate는 그 commit의 binding
  scaffold가 쓰는 것이다(binding BD-9, GN-3d). 각 crate는 `[lints] workspace = true`로 workspace의 lint를 받고,
  `src/lib.rs`의 attribute는 binding scaffold가 쓰는 꼴이며, Go와 WASM crate는 `polyspec-http-media-type`을 적고, PHP
  crate는 `build.rs`를 가져 macOS 링커에게 자기 라이브러리에만 PHP의 기호를 정의하지 않은 채 두게 하며 `[lib]`에
  `test = false`와 `doctest = false`를 둔다. `.cargo/config.toml`은 지운다. 그 파일은 core의 시험 실행 파일까지
  workspace의 모든 crate에 같은 링크 설정을 주었다. Node addon은 그 설정을 `build.rs`의 `napi_build::setup()`에서 받는다.
  전에는 binding 1bf0025의 `make bindings-check`가 crate마다 CK-19를 보고했다. `cargo fmt --all --check`(`make
  fmt-check`)는 binding scaffold가 쓰는 `src/lib.rs` 네 파일에서 실패한다. `rustfmt.toml`이 `use_small_heuristics =
  "Max"`로 각 attribute를 한 줄에 두는데, binding은 기본 폭의 꼴로 attribute를 쓰기 때문이다.

- WASM 바인딩에서 group internal의 contract case(`packages/ts/tests/cases.wasm.test.mjs`)가 생성된 시험처럼
  wasm-bindgen이 쓴 모듈의 `__armFaults`와 `__faultLeft`로 fault를 건다(binding GN-5). 전에는 그 둘을 export하지
  않는 subpath `./wasm`의 모듈에서 찾았으므로, `make test-wasm`이 case `a_broken_index_is_internal`을 "the module has
  no entry point that arms faults"로 실패시켰다.

- `make bindings`, `make bindings-check`와 `node_modules` 설치가 `var/tools`의 Node.js와 npm(Makefile의 `$(NODE)`와
  `$(NPM)`)을 실행한다. make는 shell 문법이 없는 recipe 줄을 Makefile이 export하는 `PATH`가 아니라 자기 환경의
  `PATH`로 실행하므로, `npm ci`는 기계의 npm을 실행해 `devEngines`의 npm 12.2.0을 거부하고(`EBADDEVENGINES`)
  `node_modules`가 없는 checkout에서 `make check-declarations`를 실패시켰으며, `scripts/binding.mts`는 Node.js
  26.12.0 대신 기계의 Node.js로 실행되었다.

- 도구가 binding처럼 고정되고 checkout의 `var/tools`에 설치된다. `mise.toml`과 `mise.lock`은 Node.js 26.12.0, npm
  12.2.0, Go 1.27.3, Python 3.14.8, Composer 2.10.3, wasm-bindgen CLI 0.2.130을 binding의 digest로 고정하고,
  `config/toolchain.json`은 mise 2026.10.10을 고정하며, `.php-version`은 PHP 8.4를 적고, `rust-toolchain.toml`은
  target `wasm32-unknown-unknown`을 더한다. 새 `package.json`은 `devEngines`에 npm 12.2.0을 적고 TypeScript 7.0.2와 `@polyspec/kit`
  0.0.109를 적는다. binding의 recipe처럼 `make bootstrap`, `make install`, `make install-tools`, `make install-packages`, `make
  toolchain-lock`이 그 설치기를 실행한다. 모든 recipe는 `var/tools/bin`과 mise의 shim을 `PATH` 앞에 두고 실행하며,
  `GO`, `GOFMT`, `WASM_BINDGEN`, `PHP`, `PHP_CONFIG`는 `var/tools`의 도구를 가리킨다. 전에는 모든 recipe가 기계의
  `PATH`가 가리키는 도구를 고정된 판 없이 실행했다.

- `make test-bindings`가 계약의 모든 target을 빌드하고 시험한다(binding BD-27). `make test-python`, `make
  test-node`, `make test-wasm`, `make test-php`, `make test-go`는 각각 binding이 생성한 시험과 그 바인딩의 새 contract
  case를 그 언어의 표준 runner로 실행한다. `packages/python/tests/test_cases.py`는 unittest로,
  `packages/ts/tests/cases.test.mjs`와 `packages/ts/tests/cases.wasm.test.mjs`는 node --test로(WASM 바인딩은 설치된
  패키지의 subpath `./wasm`으로, 모듈은 둘이 함께 쓰는 단계 `node-package`에서 wasm-bindgen CLI가 쓴다),
  `packages/php-ext/tests/CasesTest.php`는 PHPUnit으로, `packages/go/tests/cases_test.go`는 `packages/go/go.mod`의 go
  지시문의 판인 Go와 `GOTOOLCHAIN=local`로 go test로 실행한다. 각 runner는 `contracts/negotiate.json`의 group
  `accept`, `weigh`, `invalidCandidates`, `internal`의 모든 case를 받아 그 range, weight, 또는 `raises`를 비교한다.
  `internal`의 case는 `accept.weigh`에 그 fault를 걸고, fault가 일어나지 않으면 실패한다. Go와 WASM runner는 그
  case를 실패시킨다. 그 바인딩들에는 fault를 거는 진입점이 없기 때문이다. 계약에 fault 주입 지점이 있으므로 Python, Node, PHP, WASM crate는 feature `panic-test`와
  `fault-test`(`TEST_FEATURES`)로 빌드되고 lint된다(binding GN-5). `make check-declarations`는 `package.json`의
  TypeScript로 Node와 WASM 바인딩의 선언을 검사한다. `make test-python`은 http-media-type의 wheel
  `HTTP_MEDIA_TYPE_WHEEL`을 설치하고 `make test-php`는 그 확장 `HTTP_MEDIA_TYPE_EXTENSION`을 로드한다. range가 그
  record `Parameter`를 담기 때문이다. `make fmt-check`는 코어만이 아니라 workspace 전체에 `cargo fmt --all --check`를
  실행하고, `make lint-rust`는 코어의 clippy이며, `make lint`는 그 둘을, `make test`는 코어의 시험을 실행한다.
  PHPUnit은 `composer.json`의 의존성이고 `composer.lock`이 고정하며, `.cargo/config.toml`은 macOS에서 PHP와 Node
  런타임의 기호를 정의하지 않은 채 둔다. `.gitignore`는 `packages/ts/wasm/generated/`와
  `packages/go/internal/ffi/generated/`를 적으므로, `make bindings`가 쓰는 Go 파일 `zz_generated_*.go`는 추적된다
  (binding GN-3). 전에는 이 저장소의 바인딩을 빌드하거나 시험하는 make target이 없었다. 고정된 binding은 Go와 WASM의
  feature fault-test 진입점을 생성하지 않으므로 계약의 생성을 거부한다(G-4). 그래서 `make bindings`는 파일을 쓰지
  않고, 추적할 Go 파일도 생성되지 않으며, `make test-bindings`의 모든 target이 그 원인으로 실패한다. `make
  fmt-check`는 `packages/go/internal/ffi/src/lib.rs`에서 실패한다. binding scaffold가 쓰는 125자의 줄 때문이다.

- binding의 커밋 8faad21의 end-to-end 검사(GN-14)가 이 계약의 바인딩을 target마다 빌드하고 시험한다. 계약이 record
  `parameter`를 적는 레포로 http-media-type을 함께 쓴다. PHP는 PHPUnit에서 생성된 시험 94개, Python은 unittest에서
  94개, Node는 `node --test`에서 95개를 통과하며, 실패하거나 건너뛴 시험은 없다. Go와 WASM은 생성에서 이름이 붙은
  거절로 실패한다(G-4). 둘 다 feature `fault-test`의 진입점(G-5)과 다른 레포의 record `http-media-type.parameter`가
  거절되고, Go는 class unit `accept`도 거절된다. 생성된 시험은 실패하는 case(B-4)를 실행하고 case의 결과는 비교하지
  않으며(binding GN-13a), binding에는 이 라이브러리의 case runner가 없으므로(V-1), 실패하지 않는 case 71개는 코어
  시험만 확인한다. 바인딩 패키지에는 그 커밋의 binding scaffold가 쓰는 `packages/php-ext`의 `build.rs`(BD-9)가 없다.
  `Cargo.lock`은 브랜치의 head인 binding f63a655를 고정하며, 그 파일은 더 뒤의 커밋을 고정할 때 들어온다.
  `AGENTS.md`와 `README.md`는 binding의 end-to-end 검사가 바인딩을 빌드하고 시험한다고 적는다.

- case `a_broken_index_is_internal`은 member `accept.weigh`만 읽는 자기 group `internal`에 있다
  (`packages/rust/interface.json`의 `cases` 행). group `weigh`에서는 member `accept.parse`도 그 case를 읽었다. 그
  생성된 시험은 그 점에 닿지 않는 `parse`를 위해 점을 arm하고 `parse`가 내지 않는 kind `internal`을 기대했으므로,
  binding의 end-to-end 검사에서 `Accept.parse`의 Node 시험이 실패했다.

- kind `internal`이 자기 case를 갖는다(binding CK-22, X-1). 어떤 입력도 그 kind에 닿지 않으므로, 코어는
  `Accept::weigh`에서 후보를 정하는 range의 index를 인터페이스의 정수로 바꾸는 자리에 결함 주입점
  `http_negotiation.internal`(`fault::INTERNAL`)을 두고, 계약은 그 점을 `faults`에 적는다(inject `broken`, fills
  `internal`). group `weigh`의 case `a_broken_index_is_internal`은 그 점을 arm하고 kind `internal`을 낸다.
  `tests/contracts.rs`는 생성된 binding 시험처럼 그 점을 arm하고, 터지지 않은 결함을 실패시킨다. 코어는
  `polyspec-binding-core`의 feature를 켜는 feature `fault-test`를 가지며, Python, Node, PHP의 binding crate는
  binding scaffold가 쓰는 대로 그 feature를 켠다. 코어 시험은 `polyspec-binding-core`에 대한 dev-dependency로 그
  feature를 켠다. spec은 NG-11.4에 그 점과 그 표를 적는다. `make bindings-check`는 finding 없이 통과한다.
  `make bindings`는 계약을 이름으로 거부한다: 고정된 생성기는 아직 Go와 WASM의 fault-test entry point를 쓰지
  않는다(G-5).

- 후보 값의 검사가 실패할 수 없는 앞선 값의 slice에서 더는 `internal`을 내지 않는다. 지금 값 앞의 값들을 `take`로
  읽으므로, `internal`은 NG-11의 표가 적는 대로 후보를 정하는 range의 index에서만 나온다.

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
