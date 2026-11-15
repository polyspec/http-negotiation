<!-- doc-id: changelog -->
<!-- source-sha256: 78686f7e771cd75b38b182b4a0d5af0cc2be99074e5b29e3a947453bbd11eb0e -->

## Unreleased

- `release.yml`의 job도 각각 recipe 하나다(T1.17). `make ci-tag`와 `make ci-release`는 token, CI 실행의 id, actor,
  tag를 job의 `env:`에서 읽는다. `ci-tag`는 release-tag에 `GITHUB_ENV`용 자기 파일을 주고 같은 step에서 그 파일의 TAG와
  VERSION을 읽는다. job `release`는 run step 앞에서 각 플랫폼의 asset을 `var/release/platform-assets`로 내려받고,
  `ci-release`가 draft release를 만든 뒤 그것을 `var/release/assets`에 더하므로 publish, asset, undraft의 순서가 유지된다.

- `ci.yml`과 `assets.yml`의 job은 각각 Makefile의 recipe 하나다(T1.17). job의 run step 하나는 `make ci-check
  NAME=<name>`, `make ci-platform`, `make ci-php EXPECTED_PHP_MINOR=<minor>`, `make ci-npm` 중 하나이고, 호출된 workflow의
  input인 `RELEASE`를 받는다. job `ci-passed`는 `make ci-passed RESULTS='<needs의 JSON>'`을 실행한다. 이전에는 job이 설치,
  step 조건, 대상을 YAML의 step과 expression에 가졌으므로 local 실행은 GitHub runner 없이 job을 반복할 수 없었다. 이제
  recipe가 먼저 설치를 실행하고 그것이 실패하면 멈추며, 다음에 검사를 끝까지 실행하고, 마지막에 요약을 항상 쓴다. job
  `check`의 각 항목의 대상은 Makefile의 `CI_CHECK_TARGETS_<name>`이고, `ci-passed`는 `FAIL_SKIPPED`를 스스로 정한다.
  `tests/scripts/workflows.test.mts`는 run step이 둘 이상인 job, run step의 조건이나 환경 변수, matrix 값이나 input이 아닌
  expression, `ci-<job>`이 아닌 대상을 실패시킨다. 이 test는 변경 전의 workflow에서 실패했고 변경 뒤에 통과한다.
  `docs/spec/native-assets.md`의 ASSET-5가 PHP job을 그 recipe로 정하고, 실패한 step 뒤에도 step을 실행하던 ASSET-2를 대체한다.

- Asset workflow는 non-PHP platform build 세 개와 native PHP platform/minor build 여섯 개를 분리한다(T1.14-6, ASSET-1부터 ASSET-4). 지원 build minor를 8.4와 8.5로 선언한다. PHP job마다 runtime 하나를 선택한 뒤 expected-minor build 한 번을 실행하고 고유 artifact를 업로드한다. Owner assertion은 잘못된 matrix 문법, 범위, runner, runtime setup, 중복 producer를 거부한다. Native/전체 CI 증명은 생성 expected-minor gate 공개와 recipe 재생성을 기다린다.

  Workflow owner test는 8/8 통과했다. 선언한 `make test-scripts` 검사는 18개 통과와 실패 하나다. 기존 lock에 binding-core 0.0.2가 있고 direct manifest/test pin은 0.0.3을 요구한다. 일치하는 공개 의존성 graph를 고정하고 그 검사가 통과할 때까지 T1.14-6은 active다. 이 변경은 의존성 pin을 바꾸지 않는다.

- release는 플랫폼별 바인딩 package를 GitHub Release의 asset으로 갖는다. binding 0.0.3이 contract의 release recipe를
  쓴다(binding GN-19h). `make release-recipes`가 `binding release-recipes --root .`을 실행해 무시되는 파일
  `packages/release.mk`를 쓰고, Makefile은 `BINDING_RUN`, `NODE`, `NPM`, `UV`, `BINDING_DEP`를 정의한 뒤 그것을
  include한다. 그래서 이 저장소는 자기 recipe를 두지 않는다. 새 workflow `.github/workflows/assets.yml`은
  `ubuntu-26.04`, `ubuntu-26.04-arm`, `macos-15`에서 각 플랫폼의 Go module 정적 라이브러리, abi3 wheel, PHP 8.4와 8.5용
  PHP 확장, npm 플랫폼 package를 빌드하고, `ubuntu-26.04-arm`에서 WASM module을 가진 npm package를 빌드한다(binding
  GN-19a, GN-19i). `ci.yml`은 모든 실행에서 그것을 호출하고, `release.yml`은 tag에 대해 그것을 호출하며, PHP 확장의
  Composer package로 draft release를 만들고, `make release-go-module`로 Go module을 옮기고, `make
  release-platform-assets`로 asset을 올리고, release를 공개한다. `config/release.json`은 `packages/php-ext`의 Composer
  package를 release하고 `goModules`에 `packages/go`를 더 적지 않는다. `make release-go-module`이 생성 파일과 정적
  라이브러리를 더한 commit에 tag하기 때문이다(binding GN-19f). binding 의존은 release 0.0.3이다(`package.json`,
  `package-lock.json`, 모든 Cargo manifest의 `polyspec-binding-core`의 tag `v0.0.3`, `Cargo.lock`). `@napi-rs/cli`
  3.10.12가 devDependency이고, `config/toolchain.json`이 LLVM 21을 고정하며, `rust-toolchain.toml`이 `llvm-tools`와 Linux
  arch의 musl target을 적고, `mise.toml`과 `mise.lock`이 uv 0.12.24를 적는다. release의 각 job이 tag를 checkout하므로
  target `release-checkout`은 없어졌다. 새 시험 `tests/scripts/workflows.test.mts`가 runner, 고정, run step, release
  step의 순서를 검사한다. `Cargo.lock`은 아직 0.0.3 옆에 http-media-type 0.0.1의 binding 0.0.2를 고정한다. 그래서
  http-media-type 0.0.2를 고정하기 전까지(T1.14-5) `binding check --release`는 CK-20을 보고하고
  `tests/scripts/binding.test.mts`의 `Cargo.lock` 시험은 실패한다. Red: include가 없는 Makefile에 `binding check
  --release`가 CK-94를 보고했고, `make test-scripts`는 `workflows.test.mts`의 시험 3개와 `binding.test.mts`의 binding
  release 시험 2개에서 실패했다. Green: `binding check --release`는 CK-20만 보고하고, `make test-scripts`는 시험 14개 중
  13개를 통과하며, `make docs-check`와 `make release-coverage`는 통과한다(T1.14).
## 0.0.1

- http-media-type은 release된 의존이다. 코어와 바인딩 crate가 http-media-type의 브랜치 `v1/rust-core` 대신 tag
  `v0.0.1`을 적고, `Cargo.lock`이 그 tag의 커밋을 고정한다. binding scaffold가 바인딩 manifest를 다시 썼다.
  `packages/go/go.mod`가 http-media-type의 Go module을 `v0.0.1`로 요구하고, PHP package와 Python package가 그 release
  0.0.1을 요구한다. `binding check --release`는 아무것도 보고하지 않는다(T1.9).
- binding은 release된 의존이다. 코어와 바인딩 crate의 `polyspec-binding-core`가 브랜치 `v1/rust-core` 대신 binding
  저장소의 tag `v0.0.2`를 적고, `Cargo.lock`이 그 tag의 커밋과, 바인딩 crate가 같은 tag를 적는 브랜치 head의
  http-media-type을 고정한다. http-media-type 의존은 http-media-type이 tag를 낼 때까지 그 브랜치에 남는다(T1.9). 도구는
  같은 release의 npm package `@polyspec/binding`이고, `package.json`이 그것을 release asset의 URL로 적고
  `package-lock.json`이 그 integrity로 고정한다. recipe는 그 `dist/cli.js`를 실행한다. binding이 crate를 `cargo metadata
  --locked --offline`으로 읽으므로 `make install-binding`이 `cargo fetch --locked`를 실행하고, `scripts/deps.mts`가
  http-media-type의 checkout을 clone한다. binding도 `var/binding`에 clone하던 `scripts/binding.mts`는 지웠다. 새 시험
  `tests/scripts/binding.test.mts`는 브랜치 의존에서 네 시험 모두 실패했고 release로 통과한다. binding이 http-media-type의
  계약을 Cargo로 읽으므로, 바인딩 crate와 binding의 검사는 빌드 큐에서 실행한다.

- `make documents-stamp PATHS=<twin>`이 번역을 검토한 뒤 kit의 stamp로 이름 붙인 각 한국어 쌍의 `source-sha256`을 그
  영어 파일에서 쓴다. 전에는 표시를 손으로 썼다.

- `[profile.release]`는 `lto = false`를 정한다. 이전에는 `lto = true`였고, 그러면 Go 정적 라이브러리를
  Go module이 require하는 http-media-type의 정적 라이브러리와 함께 링크하는 Go program이 `rust_eh_personality` 같은 중복 symbol로
  실패한다(binding GN-15i, CK-91). Cargo는 `lto`를 profile 전체에 정하므로 release의 PHP 확장, Node addon, wheel도
  LTO 없이 빌드된다. `Cargo.lock`은 `polyspec-binding-core`를 binding의 branch `v1/rust-core`의 head로 고정하며, 그
  scaffold는 바인딩 package를 지금 그대로 쓴다. 새 시험 `tests/scripts/profile.test.mts`는 `Cargo.toml`과
  `.cargo/config.toml`의 profile을 읽는다. 변경 전에는 `make test-scripts`의 시험 하나가 실패했고 변경 후에는 모두
  통과한다. `Cargo.lock`은 `polyspec-http-media-type`도 그 branch의 head로 고정하며, 그 release profile도 같다. 검증: `make -k bindings-check test-scripts docs-check lint-bindings check-declarations test-python test-node test-wasm test-php test-go`가 통과했다. `make test-go`는 이전에 pin된 binding에서 실패했던 `packages/go/accept`의 생성된 시험 37개를 통과한다.

- 바인딩 target은 자기가 읽는 것을 빌드하고 아무것도 내려받지 않는다. `make install-binding`은 `Cargo.lock`의 커밋으로
  binding을 설치하고, `Cargo.lock`의 crate를 받고, http-media-type의 checkout을 그 커밋으로 `var/deps/http-media-type`에
  clone하며, CI는 모든 job에서 그것을 실행한다. `scripts/binding.mts`는 그것을 offline으로 읽는다. `make
  media-type-python`, `make media-type-php`, `make media-type-go`는 거기서 http-media-type의 wheel, PHP 확장, 정적
  라이브러리를 생성하고 빌드하며, `make test-python`, `make test-php`, `make test-go`가 그것을 읽는다. 이전에는 앞의 둘이
  CI에서 없는 파일 때문에 실패했고, `make test-go`의 `go vet`은 http-media-type의 Go module의 `go.sum` 항목이 없다고
  실패했다. 이제 `var/go.work`가 그 module을 해소한다(T1.7, T1.9). `make test-go`는 Go crate를 그 manifest의 모든
  feature로 빌드하고 그 build tag로 go test를 실행하며, Go case runner는 group internal의 case를 실패시키는 대신 binding의
  진입점으로 그 fault를 arm한다. `make lint-bindings`는 Go crate의 feature `codec-test`로 lint한다. `mise.toml`과
  `mise.lock`은 pip이 PyPI에서 설치한 maturin 대신 maturin 1.16.0을 binding의 digest로 고정한다. recipe는
  `var/tools/bin`의 node와 npm을 실행하고, `make check-declarations`는 더 이상 `npm ci`를 실행하지 않으며, wheel과
  tarball은 offline으로 설치된다. `tests/scripts/recipes.test.mts`가 recipe의 dry run에서 이것들을 각각 검사한다.
  변경 전에는 그 시험 중 4개가 실패했고 변경 후에는 5개가 통과한다. maturin은 http-media-type의 wheel을 이 checkout에서
  clone의 manifest로 빌드한다. mise의 shim은 mise가 신뢰하지 않는 `mise.toml`이 있는 폴더를 거부하기 때문이다. 검증:
  `make test-python`, `make test-php`, `make test-node`, `make test-wasm`, `make check-declarations`, `make
  lint-bindings`, `make test-scripts`, `make docs-check`가 통과한다. `make test-go`는 contract case를 통과하고
  `packages/go/accept`의 생성된 시험 37개에 실패하며, 그 원인은 행 T1.7이 적는다.

- 문서는 pin된 binding에서의 Go 바인딩을 있는 그대로 적는다. binding은 계약의 Go를 생성하고, Go 바인딩은
  http-media-type의 Go module을 import한다. `packages/go/go.mod`는 그 module을 개발 형태로 require하고 추적되는 파일
  가운데 그것을 해소하는 것이 없어서, 추적되는 파일만 있는 tree의 `go vet`은 그 module의 `go.sum` 항목이 없다고
  실패한다. 행 T1.7은 우회 상태가 아니라 다시 열린 상태다. 그 원인은 binding이 Go를 거부한다는 것이었고, 남은 일은
  그 module도 그 정적 라이브러리도 주지 않는 `make test-go`의 recipe, 그리고 target go에 대한 binding의 end-to-end
  검사다. 그 실행은 복사본에 그 module의 `go.work`를 주지 않는다. 행 T1.10은 끝났다. commit된 tree에서 `make
  fmt-check`가 통과한다. `AGENTS.md`는 생성된 Go 파일 `zz_generated_*.go`를 추적하지 않는다는 것과 그 이유를 적는다.

- `Cargo.lock`은 `polyspec-binding-core`와 `polyspec-http-media-type`을 각 저장소의 branch `v1/rust-core`의 head에
  pin하고, 바인딩 package는 그 binding의 scaffold가 쓰는 것과 같다. 그래서 `make bindings-check`는 finding을 보고하지
  않는다. 전에는 lock(CK-20)과 항목 열세 개(CK-19)를 보고했다. 그 가운데 하나는 Go module이었다. pin된
  http-media-type에 Go module이 없어서 scaffold가 그것을 쓰지 않았다. 각 바인딩 crate와
  `packages/python/pyproject.toml`은 코어의 licence `MIT`를 적고(CK-71), 각 `src/lib.rs`는 allow 속성을 한 줄로
  가진다. 그래서 `make fmt-check`가 통과한다(T1.10). `packages/python/build.rs`가 새로 생겼다. 이 파일은 cfg
  `pyo3_disable_reference_pool`을 선언하고, 생성된 코드는 그 cfg가 있는 build를 거부한다(binding GN-6u).
  `packages/ts/package.json`에는 `"type": "module"`, `napi.binaryName`, `napi.targets`가 있고
  `optionalDependencies`는 없다. release가 자신이 pack하는 manifest에 플랫폼 package를 쓴다(binding GN-3c).
  `packages/php-ext/composer.json`은 http-media-type의 확장과 package를 require한다. 생성된 코드가 load될 때 그
  class가 필요하기 때문이다(binding GN-3e). 그리고 `php-ext.download-url-method`로 `pre-packaged-binary`를 적는다.
  `packages/go/go.mod`는 http-media-type의 Go module을 개발 형태 `v0.0.0`으로 require한다(binding GN-15f). binding은
  계약의 다섯 target을 Go를 포함해 모두 생성한다. `.gitignore`는 생성된 Go 파일 `zz_generated_*.go`를 적고, 그
  파일들은 추적하지 않는다. release가 그 파일들과 각 플랫폼의 정적 라이브러리를 Go tag의 commit에 더한다(binding
  GN-15g).

- 추적 파일은 Git commit을 적지 않는다. changelog와 checklist가 이 저장소와 binding의 commit을 적고 있었는데, commit은
  저장소 없이 읽는 사람에게 아무것도 알려 주지 않고 history가 합쳐지거나 다시 쓰이면 아무것도 가리키지 않는다. 각
  기록은 사실을 그대로 두고 binding을 고정된 것 또는 더 뒤의 것으로 적는다. `AGENTS.md`에 규칙이 있고, `make
  test-scripts`가 `tests/scripts/commits.test.mts`를 실행한다. 이 시험은 commit된 tree에서 실패했고 지금 통과한다.

- release는 release commit에 Go module `packages/go`를 `packages/go/vX.Y.Z`로 tag한다. `config/release.json`의
  `goModules`가 그 module을 가리킨다. 전에는 `goModules`가 비어 있었고 규칙은 tag가 Go module을 tag하지 않는다고 했다.
  Go는 저장소 루트 아래의 module을 그 형태의 tag로만 가져오므로, 다른 저장소가 그 module을 version으로 요구할 수
  없었다(binding GN-15g). `make release-coverage`는 모든 package 파일이 분류되었다고 보고한다. `AGENTS.md`는 첫 release
  전에 열려 있는 일을 적는다. `origin`의 `main`, 그리고 kit 0.0.111과 binding의 release를 기다리는 바인딩의 package다.

- 저장소에 GitHub의 검사와 release가 생겼다. 전에는 어떤 workflow도 검사를 실행하지 않았고, 어떤 step도 commit을
  tag하거나 GitHub Release를 만들지 않았다. `.github/workflows/ci.yml`은 `main`의 push와 수동 실행에서
  `ubuntu-26.04-arm` 위에 `make check`, `make test-bindings`, `make release-coverage`를 job `core`와 `bindings`로
  실행한다. 각 대상은 `make ci-targets`로 실행하고, 마지막 job `ci-passed`는 두 job이 모두 통과했을 때만 통과한다.
  `.github/workflows/release.yml`은 그런 실행의 commit을 `CHANGELOG.md` 맨 위 section의 version으로 tag하고 그 GitHub
  Release를 만든다. `config/release.json`은 코어 crate를 Git tag로 release하고 archive는 release하지 않는다. Makefile에
  `install-php-tools`, CI 대상, release 대상이 생겼다. `make release-coverage`는 "No rule to make target"으로 실패했고,
  지금은 모든 package 파일이 분류되었다고 보고한다. job `bindings`는 `make test-python`과 `make test-php`에서
  실패한다. 그 대상이 읽는 wheel과 PHP 확장을 http-media-type의 release가 가질 때까지 그렇다. Go 대상에서는 binding이
  계약의 Go를 생성할 때까지 실패한다(T1.7).

- 저장소가 다른 polyspec 저장소의 꼴로 계획 `docs/plans/rust-core/plan.md`와 그 checklist
  `docs/plans/rust-core/checklist.md`를 각각 한국어 쌍과 함께 가진다. checklist는 코어, 인터페이스 계약, 바인딩 crate의
  workspace, 바인딩, end-to-end 검사의 단계를 그것을 한 commit과 함께 끝난 것으로 적고, Go 바인딩은 binding이 계약의 Go를
  생성할 때까지 우회된 것으로 적는다. `make docs-check`는 `config/documents.json`의 문서와 `config/checklist.json`의 행을
  가진 checklist를 읽고, `make check`가 그것을 실행한다. 전에는 어떤 검사도 문서를 읽지 않았으므로 한국어 쌍이 영어
  원문보다 뒤처져도 보이지 않았다.

- core의 시험이 feature `fault-test`를 켠 core 자신에 의존한다(`packages/rust/Cargo.toml`의 `[dev-dependencies]`). 그래서
  `cargo test -p polyspec-http-negotiation`은 flag 없이 case `a_broken_index_is_internal`의 결함 주입점을 걸고, `make
  test`는 feature를 넘기지 않는다. 전에는 고정된 binding의 주입점이 그것을 쓰는 crate의 feature로만 살아 있으므로(binding
  GN-5), binding의 end-to-end 검사가 실행하는 core의 `cargo test`가 그 case를 "the faults of http_negotiation.internal did
  not fire"로 실패시켰다.

- `make bindings`가 계약의 각 target을 자기 target `make bindings-<target>`(`binding generate --target <target>`)에서
  생성하고, 각 바인딩 target은 그것에 의존한다. `make test-python`은 `bindings-python`에, `make node-package`와 `make
  check-declarations`는 `bindings-node`와 `bindings-wasm`에, `make test-php`는 `bindings-php`에, `make test-go`는
  `bindings-go`에 의존한다(binding GN-1c). 전에는 `make bindings`가 모든 target을 한 번에 생성했으므로, 고정된 binding이
  상태 1로 끝내는 go의 거부가 binding이 생성하는 php, python, node, wasm의 target을 멈췄다. `AGENTS.md`와 `README.md`는
  binding이 그 넷을 생성하고 go를 거부한다고 적는다.

- `Cargo.lock`이 `polyspec-binding-core`를 binding의 더 뒤 commit으로 고정한다. 그 commit의 결함 주입점은 macro
  `binding_core::fault::point!`이며, 그것을 쓰는 crate의 feature `fault-test`로 판정된다(binding GN-5).
  `packages/rust/src/candidate.rs`의 주입점은 `point!(crate::fault::INTERNAL)`이고, `make test`는 core의 시험을 그
  feature `fault-test`와 함께 실행한다. contract 시험이 주입점을 걸려면 그 feature가 필요하다. `make lint-rust`는 core를
  그 feature가 있을 때와 없을 때 모두 lint한다. 전에는 core가 함수 `fault::point`이 없는 고정된 binding으로 컴파일되지 않았다.

- `Cargo.lock`이 `polyspec-binding-core`를 binding의 더 뒤 commit으로 고정하고, 바인딩 crate는 그 commit의 binding
  scaffold가 쓰는 것이다(binding BD-9, GN-3d). 각 crate는 `[lints] workspace = true`로 workspace의 lint를 받고,
  `src/lib.rs`의 attribute는 binding scaffold가 쓰는 꼴이며, Go와 WASM crate는 `polyspec-http-media-type`을 적고, PHP
  crate는 `build.rs`를 가져 macOS 링커에게 자기 라이브러리에만 PHP의 기호를 정의하지 않은 채 두게 하며 `[lib]`에
  `test = false`와 `doctest = false`를 둔다. `.cargo/config.toml`은 지운다. 그 파일은 core의 시험 실행 파일까지
  workspace의 모든 crate에 같은 링크 설정을 주었다. Node addon은 그 설정을 `build.rs`의 `napi_build::setup()`에서 받는다.
  전에는 고정된 binding의 `make bindings-check`가 crate마다 CK-19를 보고했다. `cargo fmt --all --check`(`make
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

- binding의 end-to-end 검사(GN-14)가 이 계약의 바인딩을 target마다 빌드하고 시험한다. 계약이 record
  `parameter`를 적는 레포로 http-media-type을 함께 쓴다. PHP는 PHPUnit에서 생성된 시험 94개, Python은 unittest에서
  94개, Node는 `node --test`에서 95개를 통과하며, 실패하거나 건너뛴 시험은 없다. Go와 WASM은 생성에서 이름이 붙은
  거절로 실패한다(G-4). 둘 다 feature `fault-test`의 진입점(G-5)과 다른 레포의 record `http-media-type.parameter`가
  거절되고, Go는 class unit `accept`도 거절된다. 생성된 시험은 실패하는 case(B-4)를 실행하고 case의 결과는 비교하지
  않으며(binding GN-13a), binding에는 이 라이브러리의 case runner가 없으므로(V-1), 실패하지 않는 case 71개는 코어
  시험만 확인한다. 바인딩 패키지에는 그 커밋의 binding scaffold가 쓰는 `packages/php-ext`의 `build.rs`(BD-9)가 없다.
  `Cargo.lock`은 브랜치의 head인 binding을 고정하며, 그 파일은 더 뒤의 커밋을 고정할 때 들어온다.
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

- `Cargo.lock`은 같은 라이브러리 묶음의 모든 레포가 고정하는 binding commit과 그 위의 `polyspec-http-media-type` 커밋을
  고정한다(CK-20). 바인딩 package는 그 scaffold가 쓰는 것이며, Node 패키지는 addon의 플랫폼 패키지마다 optional
  dependency를 가진다.
