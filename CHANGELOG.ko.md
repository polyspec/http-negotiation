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
