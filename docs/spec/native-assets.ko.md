<!-- doc-id: native-assets -->
<!-- source-sha256: 49795653b1aa010ea937d8302fb636e9eccc3b75e51605ab54278e42584ea34d -->
# Native asset job

[English](native-assets.md)

T1.14-6은 요구 workflow 동작을 정의하고, T1.17은 각 job의 step을 그 recipe로 옮긴다(ASSET-5). Workflow는 source 계약을 구현하며 ASSET-4에 따라 native/전체 CI 증명은 남아 있다.

- **ASSET-1** Non-PHP job은 native platform마다 Go 정적 라이브러리, wheel, npm platform package를 한 번 빌드한다.
  linux-x64-gnu는 ubuntu-26.04, linux-arm64-gnu는 ubuntu-26.04-arm, darwin-arm64는 macos-15에서 실행한다.
  별도 PHP job은 이 platform과 `config/toolchain.json`의 `phpExtension.minors`의 정확한 곱을 실행한다.
  PHP 8.4는 package 범위의 하한이며 8.4와 8.5를 지원 build minor로 선언한다.
  두 job은 matrix runner를 사용하며 다른 축, 제외, 누락, 중복 pair를 허용하지 않는다.
- **ASSET-2** ASSET-5가 대체한다. job이 Makefile의 recipe 하나이므로 PHP job의 step은 실패한 step 뒤에 더 이상
  실행되지 않는다.
- **ASSET-3** 각 결과는 고유 artifact를 업로드한다. Non-PHP는 `assets-${{ matrix.platform }}`,
  PHP는 `assets-php-${{ matrix.platform }}-${{ matrix.php }}`, 독립 package는 `assets-npm`이다.
  Release는 전체 asset 검증 전에 `assets-*`를 수집하므로 결과끼리 덮어쓰지 않는다.
- **ASSET-4** Source assertion은 workflow 연결만 증명한다. Binding의 expected-minor gate가 공개되고
  recipe를 다시 생성하며 native job이 통과하기 전까지 native minor 선택, 로딩, 전체 CI는 검증되지 않았다.
  Consumer wrapper로 생성 provider gate를 대체하지 않는다.
- **ASSET-5** PHP 결과마다 `matrix.php`의 setup으로 runtime 하나와 그 php-config를 선택하고, run step 하나
  `make ci-php EXPECTED_PHP_MINOR=${{ matrix.php }}`가 Makefile의 recipe `ci-php`를 실행한다. recipe는 job의 도구, 잠긴
  의존성, 생성 recipe를 준비하고 그중 처음 실패한 것에서 멈추며, 한 번 빌드한다:
  `make release-php-ext PHP=php EXPECTED_PHP_MINOR=$(EXPECTED_PHP_MINOR)`. Non-PHP job은 PHP를 선택하거나 빌드하지
  않으며 다른 job도 asset producer를 반복하지 않는다.
