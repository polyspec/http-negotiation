<!-- doc-id: changelog -->
<!-- source-sha256: 512af8463abf1f23d8cd53889ca47119069d3d513c2ffbc6e0927c9e924dfaea -->

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
