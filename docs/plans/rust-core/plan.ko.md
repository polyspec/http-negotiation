<!-- doc-id: plan-rust-core -->
<!-- source-sha256: 1a405fcafd034b096f87fb5d9f26beb2ed97cbd808361944ebd6869f8ba4c14d -->
# Rust 코어

[English](plan.md)

http-negotiation은 `Accept` 헤더의 media range를 읽고 [명세](../../spec/negotiate.ko.md)의 규칙으로 후보의 무게를 단다.
모든 규칙은 `packages/rust`의 Rust crate `polyspec-http-negotiation`에 한 번 쓰이고, `contracts/negotiate.json`의 case로 한
번 시험된다. PHP, Python, Node, 브라우저(WASM), Go 패키지는 자기 코드를 갖지 않는다. binding이 인터페이스 계약
`packages/rust/interface.json`에서 각 패키지를 생성하고, binding scaffold가 그 바인딩 crate를 쓴다. 그래서 규칙에는 처음
것과 달라질 수 있는 두 번째 사본이 없다.

checklist는 각 단계가 앞 단계를 필요로 하는 순서를 따른다.

1. 명세와 그 case(T1.1), 그다음 그것을 통과하는 코어(T1.2).
2. binding의 다섯 target을 위한 코어의 인터페이스 계약과, kind마다 하나인 case(T1.3).
3. 코어와 binding scaffold가 쓰는 바인딩 crate를 담고 binding의 한 commit에 고정된 하나의 Cargo workspace(T1.4).
4. binding이 생성하는 바인딩. 각각 binding이 생성하는 시험과 contract case로 그 언어의 표준 runner에서 시험되며(T1.5),
   이 저장소에 대한 binding의 end-to-end 검사(T1.6).
5. Go 바인딩(T1.7). binding은 이 계약의 Go를 생성하고, Go 바인딩은 http-media-type의 Go module을 import한다. 그래서
   그 시험은 http-media-type의 checkout에서 그 module과 그 정적 라이브러리를 빌드한다.
6. GitHub의 검사와 release. workflow `ci`와 `release`, release 구성, 그 make target(T1.8), 그다음 첫 release(T1.9). 첫
   release는 wheel과 PHP 확장을 가진 http-media-type의 release와 Go 바인딩(T1.7)을 기다린다.
