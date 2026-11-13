<!-- doc-id: readme -->
<!-- source-sha256: cad6ee68601caa236dc86580dde95c391ceb272e17df00a69de6b94dc20ec458 -->
# http-negotiation

[English](README.md)

HTTP의 media range와 `Accept` field(RFC 9110 12.4.2, 12.5.1절)를 읽고, `Accept` field가 후보 media type 목록의 각
후보에 주는 weight를 계산한다. media type과 그 parameter 문법은 이 라이브러리가 의존하는 라이브러리 http-media-type의
것이다.

- `Accept::parse(lines)`는 `Accept`의 field line들을 천분율 weight를 가진 range로 읽는다. line이 없으면 `*/*`다.
- `Accept::weigh(candidates)`는 각 후보에 그 weight를 정하는 range의 weight와 그 range의 index를 준다.

이 라이브러리는 후보를 고르지 않는다. 어떤 후보가 있는지, 어느 후보를 택하는지, 받을 수 있는 후보가 없을 때 무엇으로
답하는지는 호출자가 정한다. 모든 실패는 kind를 가진 오류다(`invalid_accept`, `invalid_weight`,
`invalid_candidate`).

규칙은 [docs/spec/negotiate.md](docs/spec/negotiate.md), case는 [contracts/negotiate.json](contracts/negotiate.json),
바인딩의 공개 API는 crate 패키지에 들어가는 [packages/rust/interface.json](packages/rust/interface.json)에 있다. 코어는
`packages/rust`의 Rust crate이며, 모든 계약이 적는 다섯 target(binding BD-27)인 PHP, Python, Node,
브라우저(WASM), Go 바인딩은 인터페이스 계약에서 생성한다. 생성기는 다섯 바인딩을 쓴다. Go 바인딩은
http-media-type의 Go module을 import하는데 추적되는 파일 가운데 그 module을 해소하는 것이 없다. 그래서 `make
test-go`는 그 recipe가 그 module과 그 정적 라이브러리를 줄 때까지 실패한다(체크리스트의 T1.7).

```sh
make bootstrap       # devEngines의 npm으로 @polyspec/kit을 포함한 package-lock.json 설치
make install         # mise.toml, rust-toolchain.toml, .php-version의 도구를 var/tools에 설치
make test            # 코어: contract case와 시험
make lint            # 코어: rustfmt --check와 clippy -D warnings
make bindings        # packages/*/generated에 바인딩 생성
make test-bindings   # workspace clippy, 그다음 언어마다 바인딩을 빌드, 설치, 시험
```
