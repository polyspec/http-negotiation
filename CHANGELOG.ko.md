# 변경 기록

[English](CHANGELOG.md)

## Unreleased

- spec NG-1~NG-12를 더한다: `Accept`와 qvalue(RFC 9110 12.4.2, 12.5.1절), 의존성 http-media-type의 parameter(MT-3)인
  media range의 parameter, MT-5의 값 비교를 쓰는 range와 후보의 일치, weight를 정하는 range, 오류 kind, 무시하는 입력
  표.
- contract case `contracts/negotiate.json`(group `accept`, `weigh`, `invalidCandidates`)을 더한다.
- Rust 코어 `polyspec-http-negotiate`(`Accept::parse`, `Accept::ranges`, `Accept::weigh`; media range는
  `polyspec-http-media-type`의 문법으로 읽는다)와 그 contract·인용·무작위·런타임 시험, `unwrap`, `expect`와 실패나
  부재를 값으로 바꾸는 메서드를 금지하는 lint를 더한다.
- PHP, Python, Node 바인딩을 위한 인터페이스 계약 초안 `contracts/interface.json`을 더한다. range는 http-media-type의
  `parameter` record를 가진다.
- 인터페이스 계약을 `packages/rust/interface.json`으로 옮기고 crate의 `include`에 넣는다. crate에 의존하는 레포가
  Cargo가 해석한 패키지에서 계약을 읽게 하기 위해서이며, http-media-type의 계약도 같은 방법으로 읽는다. category
  오류 클래스 이름은 모든 언어에서 `Negotiate<Category>Error`(`NegotiateValueError` 등)이며 Python `ValueError` 같은
  내장 클래스와 겹치지 않는다.
- 계약에서 오류 클래스 `NegotiateError`를 없앤다. category `value`의 모든 kind를 담고 속성이 없었다. 읽기와 무게
  계산의 실패는 kind를 가진 `NegotiateValueError`다. Python 모듈은 polyspec 패키지 이름의 한 형식인
  `polyspec.http_negotiate`다.
- 저장소는 `bindgen scaffold`가 쓰는 바인딩 crate `packages/python`, `packages/ts`, `packages/php-ext`를 가진 Cargo
  workspace 하나다. 코어는 `polyspec-bindgen-core`에 의존하고 오류에 `Kinds`를 구현하며, `make bindings-check`가
  계약과 바인딩 패키지를 검사한다. 바인딩은 아직 생성하지 않는다.
