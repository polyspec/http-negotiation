
- 레포 이름은 http-negotiation이다: 레포 이름은 다루는 대상을 가리키는 명사이고 HTTP 메시지의 한 부분을 다루면 `http-`
  접두어를 붙인다(계획 N-1, N-2). 모든 이름이 그것을 따른다(설계 P-1, E-2): crate `polyspec-http-negotiation`, Composer
  패키지 `polyspec/http-negotiation`(네임스페이스 `Polyspec\HttpNegotiation`, 확장 `polyspec_http_negotiation`), PyPI
  패키지 `polyspec-http-negotiation`(모듈 `polyspec.http_negotiation`), npm 패키지 `@polyspec/http-negotiation`, 오류
  클래스 `HttpNegotiation<Category>Error`. 계약은 이 변경을 `changes`에 적는다.
- `polyspec-http-media-type`은 옆 checkout의 path 의존 대신 `v1/rust-core` branch의 Git 의존이며 `Cargo.lock`이 그
  커밋을 고정한다. 빌드가 다른 레포의 작업 트리를 읽지 않게 하기 위해서다.
