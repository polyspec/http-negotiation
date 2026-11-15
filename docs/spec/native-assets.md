<!-- doc-id: native-assets -->
# Native asset jobs

[한국어](native-assets.ko.md)

T1.14-6 defines the required workflow behavior. The workflow implements the source contract; native/full CI proof remains pending under ASSET-4.

- **ASSET-1** Non-PHP jobs build Go static libraries, wheels and npm platform packages once on each native platform:
  linux-x64-gnu on ubuntu-26.04, linux-arm64-gnu on ubuntu-26.04-arm, and darwin-arm64 on macos-15.
  A separate PHP job covers exactly those platforms times `phpExtension.minors` in `config/toolchain.json`.
  PHP 8.4 is the lower bound of the package range; 8.4 and 8.5 are the declared supported build minors.
  Both jobs use the matrix runner, with no other axis, exclusion, missing or duplicate pair.
- **ASSET-2** Each PHP result selects one runtime and its php-config before one build:
  `make release-php-ext PHP=php EXPECTED_PHP_MINOR=${{ matrix.php }}`. Each job prepares its own tools,
  locked dependencies and generated recipes. Setup, LLVM installation and the build use `!cancelled()` to retain
  diagnostic completion after a failed step. Non-PHP jobs never select or build PHP, and no other job repeats an asset producer.
- **ASSET-3** Every result uploads a distinct artifact: `assets-${{ matrix.platform }}` for non-PHP,
  `assets-php-${{ matrix.platform }}-${{ matrix.php }}` for PHP, and `assets-npm` for the standalone package.
  Release collects `assets-*` before the complete asset validation, so results cannot overwrite one another.
- **ASSET-4** Source assertions prove workflow wiring only. Native minor selection, loading and full CI remain
  unverified until a published binding supplies the expected-minor gate, recipes are regenerated and native jobs pass.
  No consumer wrapper replaces the generated provider gate.
