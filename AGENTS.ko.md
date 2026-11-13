<!-- doc-id: agents -->
<!-- source-sha256: cdd84553ae80d765b1e9373a829f49eb184b4cc0ef467b6a357eee93ef2a8c90 -->
# 개발

모든 polyspec 레포의 작업 원칙은 polyspec의 `PRINCIPLES.md`에 있다. 이 파일은 이 레포의 규칙만
적는다.

## 범위

- 이 라이브러리는 HTTP의 media range와 `Accept` field를 읽고 후보 목록의 각 후보에 weight를 매긴다
  (`docs/spec/negotiate.md`, NG-1부터 NG-12). media type, token과 quoted string과 parameter의 문법, parameter 값의
  비교는 이 라이브러리가 의존하는 http-media-type(`polyspec-http-media-type`, 규칙 `MT-n`)의 것이다.
  spec은 그 규칙을 가리키고, 코드는 그 문법을 http-media-type의 module `grammar`로 읽으며 그 문법의 사본을 두지 않는다. 어떤 후보가 있는지, 어느 후보를 택하는지, weight가 같은 후보의 순서,
  어느 후보에도 맞지 않는 요청에 대한 응답은 호출자가 정하며, 여기에는 그에 대한 규칙이 없다(NG-10.4).

## 규칙과 작업 순서

- 규칙은 `docs/spec/negotiate.md`의 문장이다. 규칙을 바꾸는 변경은 먼저 spec을 바꾸고, 다음에
  `contracts/negotiate.json`의 case를, 그 다음에 코드를 바꾼다. 모든 case와 모든 test는 자기가 검사하는 문장을 밝히며,
  `tests/contracts.rs`는 어떤 case나 test도 인용하지 않는 문장과, 문장이 아닌 것을 가리키는 인용을 실패로 처리한다.
- 문장은 뜻이 그대로인 동안에만 자기 id를 유지한다. 뜻을 바꾸는 변경은 그 id를 폐기하고 새 문장을 더한다.
- `contracts/negotiate.json`의 text는 byte이며, 문자 하나가 byte 하나다(U+0000부터 U+00FF). 실패는 `kind`, `status`,
  `category`, `message`를 가진 객체 `raises`이고, 실패하는 case에는 결과 key가 없다.
- case는 binding의 case 규약(G-5)을 따른다. case의 key는 그 case가 다루는 member의 parameter 이름을 snake_case로 적은 것이고,
  record는 자기 field들의 객체다. `candidates`의 후보와 parameter `{"name", "value"}`가 그 예다.
- 모든 규칙은 Rust 코어 `packages/rust`에 있다. 바인딩은 type을 변환하고 규칙을 갖지 않는다. 바인딩은
  인터페이스 계약 `packages/rust/interface.json`에서 생성하며 손으로 쓰지 않는다. 이 계약은
  crate 패키지에 들어간다(`packages/rust/Cargo.toml`의 `include`). 그래서 이 crate에 의존하는 레포는 이 계약을
  Cargo를 통해 읽는다. 이 계약이 http-media-type의 계약을 읽는 방식과 같다.
- 어떤 결과도 바꾸지 않는 입력은 spec의 표 "무시하는 입력"의 한 행이며, 그 행은 표준의 조항과 그것을 보이는
  case를 가진다. 그런 행 없이 무시되는 입력은 결함이다.
- 이 레포의 기록(spec, comment, test, changelog, commit message)은 규칙과 그 이유를 규칙
  id와 표준의 조항으로 적는다. 규칙의 출처와 그 규칙을 정한 사람을 적지 않는다.

## Rust

- `rust-toolchain.toml`이 toolchain을, `Cargo.lock`이 의존성을 고정한다. `polyspec-http-media-type`은 그 레포의
  브랜치 `v1/rust-core`에 대한 Git 의존성이며 `Cargo.lock`이 그 커밋을 고정한다. `polyspec-binding-core`도
  같다. 빌드는 다른 checkout을 읽지 않는다.
- workspace의 lint는 모든 warning, unsafe 코드, `unwrap`, `expect`, `as` 변환, 버려지는 결과를 금지한다.
  `clippy.toml`은 실패나 값의 부재를 값으로 바꾸는 method(`Option::unwrap_or`와 그 계열,
  `Result::ok`, `map_or`, `map_or_else`)를 금지한다. 규칙이 필요로 하는 사용에는 `#[allow(..., reason = "<rule id>")]`를 붙인다.
- 어떤 함수도 I/O를 하지 않고, 상태를 유지하지 않고, 기다리지 않는다(NG-12).

## 바인딩

- 이 레포는 하나의 Cargo workspace다. 코어 `packages/rust`와 다섯 target(binding BD-27)의 바인딩 crate `packages/python`,
  `packages/ts`, `packages/ts/wasm`, `packages/php-ext`, `packages/go/internal/ffi`(와 `packages/go/go.mod`)로 이루어지며, 바인딩 crate는 `binding scaffold`가 쓰고 `make bindings-check`가 비교한다. 바인딩 crate의
  `generated/`는 추적하지 않는다. 루트의 `Cargo.lock`이 모든 의존성을 고정한다.
- `polyspec-binding-core`는 binding이 release될 때까지 코어와 바인딩 crate의 Git 의존성이다(binding 레포의
  브랜치 `v1/rust-core`). `Cargo.lock`이 그 커밋을 고정한다. 코어는 자기 오류에 대해
  `binding_core::Kinds`를 구현한다(NG-11).
- `scripts/binding.mts`는 binding이 release될 때까지, `Cargo.lock`이 고정하는 커밋으로 Cargo가 만든 checkout을
  `var/binding/<commit>`에 clone하고 그 clone에서 binding을 실행한다. 그래서 생성기와 `binding_core`가 한 버전이다.
  그 clone은 그 커밋에 있는 binding의 Git checkout이다. binding check는 그 clone에서 자기 커밋을 읽어
  `Cargo.lock`의 커밋과 비교하며(CK-20), 파일만 복사한 사본에서는 이 비교가 실패한다. `make bindings`는 모든 target을
  한 번에 생성한다. 고정한 binding은 Go와 WASM에 대해 이 계약을 이름을 대어 거절하므로(G-4) 아무것도 쓰지 않는다.
- 바인딩은 binding의 end-to-end 검사(binding의 `make e2e`, GN-14)가 빌드하고 시험한다. 이 검사는 다섯 target을 하나씩
  따로 생성하고 빌드하고 그 언어의 표준 runner로 시험하며, 실패한 target을 그 원인과 함께 이름 댄다. 이 레포의 make
  대상은 바인딩을 빌드하거나 시험하지 않는다. 생성기가 거절하는 target은 그 검사의 실패로 남고, `targets`에서 빼지 않는다.

## 검사

- `make test`는 코어의 contract case, 인용 검사, random test, runtime 속성을 실행한다.
- `make lint`는 `cargo fmt --check`와, 모든 warning을 금지한 코어의 clippy를 실행한다. `make check`는 그 둘과
  `make bindings-check`를 실행한다.

## Commit과 변경

- commit message는 `type(scope): Subject`다. type은 feat, fix, docs, style, refactor, test, chore 중 하나이고, Subject는
  50자 이하이며 대문자로 시작하고 마침표 없이 끝난다. 그 뒤에 빈 줄과, 72자에서
  줄을 바꾼 본문이 온다.
- 동작 변경, 그 spec, 그 case, `CHANGELOG.md`와 `CHANGELOG.ko.md`의 `## Unreleased` 아래 항목은
  하나의 변경이다.
