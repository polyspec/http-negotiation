
- 레포는 binding 레포(bindgen의 새 이름)의 `polyspec-binding-core`(`binding_core`, `Cargo.lock`이 고정하는 Git 의존
  `https://github.com/polyspec/binding.git`)에 의존하고 그 도구를 `scripts/binding.mts`로 실행한다. 바인딩 package는
  `binding scaffold`가 쓰는 것이며, `Cargo.lock`은 같은 crate에 의존하는 `polyspec-http-media-type` 커밋을 받는다. Python
  오류 클래스는 Python의 클래스 형식으로 쓴 레포 이름인 `HTTPNegotiation<Category>Error`다(설계 N-2: 약어 낱말은
  Python에서 모두 대문자, PHP와 Node에서 첫 글자만 대문자이며 두 언어는 `HttpNegotiation<Category>Error`를 유지한다).
- case는 binding의 case 규약(G-5)을 따른다: `weigh` case는 후보를 record 객체로 담고, `invalidCandidates` case는 목록
  `candidates`(유효한 후보, 그다음 잘못된 후보)를 담으며, range의 parameter는 `{"name", "value"}`다. 파일의 이름 붙은
  후보는 없앴다.
