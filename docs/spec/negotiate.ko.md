<!-- doc-id: spec-negotiate -->
<!-- source-sha256: c486d8d0d5028c664ca02e167edfd04d05c9d4fa4063f3a3eff3940306698c4a -->
# http-negotiation 명세

이 라이브러리는 HTTP의 `Accept` field 값을 읽고, 후보 media type 목록의 각 후보에 `Accept` 값이 그 후보에 주는
weight를 준다. 이 라이브러리는 후보를 고르지 않고, weight가 같은 후보의 순서를 정하지 않고,
어떤 후보가 있는지 정하지 않고, 응답을 쓰지 않는다. 그 결정은 호출자의 것이다. 아래의 모든 규칙은
Rust 코어 `packages/rust`에 있다. 바인딩은 type을 변환하고 규칙을 갖지 않는다. media type은 이 라이브러리가 의존하는
http-media-type이 읽고 쓴다. http-media-type의 규칙 `MT-n`은 media range를 적는 token, quoted string, parameter와
parameter 값의 비교를 정의한다. 이 명세는 그 규칙을 가리키고 다시 정의하지 않는다.

표준은 RFC 9110(HTTP Semantics)과 그 12.5.1절에 대한 확인된 erratum 7138, 그리고
각 규칙이 밝히는 절이다. 규칙은 목록 항목 `**NG-n**`이다. 규칙의 번호 붙은 문장은 `NG-n.m`이며, test는 자기가
검사하는 문장을 밝힌다.

## Text

- **NG-1** 입력과 출력의 text.
  1. NG-1.4 field line 값과 range의 parameter 값은 byte이며, 문자 하나가 byte 하나다(인터페이스 계약의
     `latin1`; MT-1.1). byte 0x80부터 0xFF는 `obs-text`다(RFC 9110 5.5절).
  2. NG-1.2 type, subtype, parameter 이름은 token이므로 ASCII다. 라이브러리는 이들을 소문자로 반환한다.
  3. NG-1.5 field line 값에서 SP와 HTAB이 아닌 첫 byte 앞과 마지막 byte 뒤의 SP와 HTAB은 그 값의 일부가 아니며
     (RFC 9110 5.5절) 무시한다.

- **NG-2** Token과 대소문자.
  1. NG-2.1 token은 MT-2.1의 token이다(RFC 9110 5.6.2절).
  2. NG-2.2 type, subtype, parameter 이름은 ASCII 대소문자를 구별하지 않고 비교하며(MT-2.2), weight의
     이름 `q`도 그렇다(RFC 9110 12.4.2절, literal `"q="`에 대해서는 RFC 5234 2.3절).

- **NG-3** media range의 parameter는 MT-3의 parameter이며(RFC 9110 5.6.6절), MT-7의 parameter
  reader가 정지 이름 `q`로 읽는다(NG-5.5).
  1. NG-3.1 그 문법은 MT-3.1이며, `=` 주위에 whitespace가 없다.
  2. NG-3.2 빈 parameter는 아무것도 내지 않으며, 목록 요소를 끝내는 `,`가 뒤따르는 빈 parameter도 그렇다(MT-3.2).
  3. NG-3.3 quoted string은 MT-3.3의 것이다. 닫는 `"`가 없는 quoted string은 실패한다.
  4. NG-3.4 parameter의 값은 quoting을 벗긴 그 byte들이다(MT-3.4).
  5. NG-3.5 한 range에 이름이 같은 parameter가 둘 있으면 실패한다(MT-3.5).
  6. NG-3.6 parameter는 field가 준 순서를 유지한다(MT-3.6).

## Accept

- **NG-5** `Accept.parse(lines)`는 `Accept` field를 읽는다(RFC 9110 12.5.1절).
  1. NG-5.1 field는 그 field line 값들을 순서대로 준 것이다. field line이 없으면 field가 없다는 뜻이고, 그것은
     parameter가 없고 weight가 1000인 range `*/*` 하나다. 이 field가 없는 요청은 선호를 밝히지 않는다
     (RFC 9110 12.4.1절과 12.5.1절).
  2. NG-5.2 각 field line 값은 목록 `#( media-range [ weight ] )`이며(RFC 9110 5.6.1절과 12.5.1절),
     field의 range는 그 line들의 range를 line 순서로 늘어놓은 것이다. 각 line은 따로 읽으므로 quoted string은
     다음 line으로 이어지지 않는다. 목록 field의 field line은 그 자체가 목록이며, 그래서
     수신자가 line들을 comma로 이을 수 있다(RFC 9110 5.3절).
  3. NG-5.3 빈 목록 요소와 `,` 주위의 whitespace는 무시한다(RFC 9110 5.6.1.2절). line들에 range가
     하나도 없는 field, 예를 들어 빈 line 하나인 field는 빈 목록이며, 빈 목록은 어느 후보에도 맞지 않는다.
  4. NG-5.4 `media-range = ( "*/*" / ( type "/" "*" ) / ( type "/" subtype ) ) parameters`. range `*/subtype`은
     실패한다. type이나 subtype은 그 한 byte일 때에만 `*`다. `*`를 포함하는 다른 token은 type의 이름이다.
  5. NG-5.5 이름이 `q`인 첫 parameter(NG-2.2)는 weight이며, `weight = OWS ";" OWS "q=" qvalue`이고, range의
     parameter가 아니다. weight는 자기 range를 끝낸다. weight 뒤에서 다음 `,`나 line의 끝 앞에 whitespace가 아닌 것이
     있으면 실패한다. RFC 9110이 weight 뒤에 아무것도 정의하지 않기 때문이다(12.5.1절; 부록 B.3이 accept extension의
     제거를 기록한다).
  6. NG-5.6 weight가 없는 range의 weight는 1000이다.
  7. NG-5.7 NG-3과 NG-5를 따르지 않는 field line은 kind `invalid_accept`로 실패하고, 값이
     `qvalue`(NG-6)가 아닌 weight는 kind `invalid_weight`로 실패한다(NG-11). 실패하는 line 하나가 field를 실패시킨다.

- **NG-6** Weight(RFC 9110 12.4.2절).
  1. NG-6.1 `qvalue = ( "0" [ "." 0*3DIGIT ] ) / ( "1" [ "." 0*3("0") ] )`이며, 다음 whitespace,
     `;`, `,` 또는 line의 끝까지의 byte들이다. quote로 감싼 qvalue는 qvalue가 아니다.
  2. NG-6.2 weight는 0부터 1000까지의 천분율 정수다. `0.5`는 500, `0.05`는 50, `1.`과 `1.000`은
     1000이다. 이 값은 정확하며, 이진 소수가 관여하지 않는다.
  3. NG-6.3 weight 0은 받을 수 없음을 뜻한다(RFC 9110 12.4.2절).

## 후보에 weight 매기기

- **NG-7** 후보는 호출자가 제공할 수 있는 media type이며, range가 그 후보에 맞는 방식을 함께 가진다.
  1. NG-7.1 후보는 `type`과 `subtype`, `parameters`(각각 이름 하나와, 후보가 그 이름에 대해 제공하는 값들의 비어 있지 않은
     목록), `matching`(NG-8.3), `wildcards`(NG-8.2)를 가진다.
  2. NG-7.2 type과 subtype은 `*`가 아닌 token이다(MT-4.2). parameter 이름은 `q`가 아닌 token이며
     (MT-4.3), NG-2.2로 같은 두 이름은 실패한다(NG-3.5). 대소문자는 상관없다(NG-2.2).
  3. NG-7.3 값은 HTAB, SP, byte 0x21부터 0x7E, 0x80부터 0xFF만 가진다. 이들은 quoted string이 담을 수 있는
     byte이며(MT-3.3), 그래서 어떤 range가 그 값을 적을 수 있다. 빈 값은 유효하다. 한 parameter의 두 값이
     NG-8.4로 같으면 실패한다.
  4. NG-7.4 `matching`이 `ignore`이고 parameter를 가진 후보는 실패한다. 그 parameter는 결코 비교되지 않기
     때문이다(NG-8.3).
  5. NG-7.5 NG-7.2부터 NG-7.4를 어기는 후보는 kind `invalid_candidate`로 실패하고(NG-11), 호출 전체가
     실패한다.

- **NG-8** range는 다음이 모두 성립할 때 후보에 맞는다.
  1. NG-8.1 range의 type이 `*`이거나 후보의 type이고, range의 subtype이 `*`이거나 후보의
     subtype이다(RFC 9110 12.5.1절).
  2. NG-8.2 type이나 subtype이 `*`인 range는 `wildcards`가 true인 후보에만 맞는다.
  3. NG-8.3 후보의 `matching`에 따라: `ignore`이면 후보의 type은 parameter를 정의하지 않으며, range의
     parameter는 비교하지 않는다. 수신자가 자기가 알지 못하는 parameter를 무시하는 것과 같다(RFC 2045
     5.1절). `subset`이면 range의 모든 parameter가 후보의 parameter이고 그 값이 후보의 값 중 하나다(RFC 9110
     12.5.1절: `text/plain;format=flowed`는 `text/plain`에 적용되지 않는다). `exact`이면 `subset`과 같고, 후보의 모든
     parameter도 range의 parameter다.
  4. NG-8.4 range의 값과 후보의 값은 둘이 MT-5에 따라 그 parameter의 같은 값일 때 같다.
     NG-3.4 뒤의 byte가 같으면 같으므로 quoting은 상관없고(MT-5.1), `charset`의 값은 ASCII 대소문자를 구별하지 않고
     비교하며(MT-5.2), 다른 모든 값은 정확히 비교한다(MT-5.3).

- **NG-9** 후보의 weight를 정하는 range.
  1. NG-9.1 맞는 range의 구체성은 먼저 그 형태이며, `type/subtype`이 `type/*`보다 위이고 `type/*`가 `*/*`보다 위다. 그 다음은
     parameter의 수이며, 이 수는 `matching`이 `subset`이나 `exact`인 후보에 대해서만 센다
     (RFC 9110 12.5.1절: "the most specific reference has precedence").
  2. NG-9.2 맞는 range 가운데 가장 구체적인 것이 정한다. 구체성이 같은 것 가운데서는 weight가 가장 높은
     것이, 그 가운데서는 field 순서로 첫 번째 것이 정한다.

- **NG-10** `Accept.weigh(candidates)`는 후보마다 결과 하나를 후보 순서로 준다.
  1. NG-10.1 결과는 정하는 range(NG-9)의 weight와, `Accept.ranges()`에서 그 range의 index다.
  2. NG-10.2 어느 range도 맞지 않는 후보는 weight가 0이고 index가 없다(null). 그것이 index가 없는 유일한
     이유다. 정하는 range의 weight가 0인 후보는 weight가 0이고 그 range의 index를 가진다.
  3. NG-10.3 정하는 range의 parameter는 그 index로 `Accept.ranges()`에서 읽는다.
  4. NG-10.4 라이브러리는 후보를 택하지 않고 같은 weight의 순서를 정하지 않는다. 그것은 호출자의 결정이다.

## 오류와 runtime

- **NG-11** 모든 실패는 kind를 가진 오류다. 어떤 함수도 실패에 대해 자리를 채우는 값을 반환하지 않는다.

  | Kind | Status | Category | 경우 |
  |---|---|---|---|
  | `invalid_accept` | 400 | value | NG-5.7, 문법을 따르지 않는 field line |
  | `invalid_weight` | 400 | value | NG-5.7, qvalue가 아닌 weight |
  | `invalid_candidate` | 없음 | value | NG-7.5 |
  | `internal` | 없음 | internal | 인터페이스의 정수에 들어가지 않는 index. 메모리 안에서는 일어날 수 없다 |

  1. NG-11.3 `Accept` field는 언제나 요청 field이므로, 그 두 실패는 status 400, 잘못된 형식의 요청
     문법을 가진다(RFC 9110 15.5.1절). 후보는 호출자에게서 오며, 호출자가 status를 정한다.
  2. NG-11.2 오류의 message는 그 kind의 고정된 문장이며 입력을 적지 않는다.

- **NG-12** 모든 함수는 순수하다. I/O가 없고, 호출 사이의 상태가 없고, 기다림이 없다(인터페이스 계약의 `wait: none`).
  1. NG-12.1 모든 type은 `Send + Sync`이며 최대 16 byte의 alignment를 필요로 한다.
  2. NG-12.2 여기서는 어떤 입력 크기도 제한하지 않는다. 라이브러리는 받은 모든 byte를 field 길이에 선형인
     시간에 읽고, weight 매기기는 range의 수와 후보의 수의 곱에 비례하는 시간이 걸린다.
     host가 field의 크기를 제한한다(RFC 9110 5.6.1.2절: "a reasonable number of empty list elements").

## 무시하는 입력

각 행은 어떤 결과도 바꾸지 않는 입력이다. 마지막 열에 적힌 case가 그것을 보인다.

| 규칙 | 무시하는 byte | 근거 | Case |
|---|---|---|---|
| NG-1.5 | field line 값 주위의 SP와 HTAB | RFC 9110, 5.5 | `accept/white_space_around_a_line_is_ignored` |
| NG-5.3 | 빈 목록 요소와 `,` 주위의 whitespace | RFC 9110, 5.6.1.2 | `accept/empty_list_elements_are_ignored` |
| NG-3.2 (MT-3.2) | 빈 parameter와 `;` 주위의 whitespace | RFC 9110, 5.6.6과 B.3 | `accept/empty_parameters_are_ignored`, `accept/a_trailing_semicolon_is_an_empty_parameter` |
| NG-3.4 (MT-3.4) | quoted 값의 quote와 quoted pair의 backslash | RFC 9110, 5.6.4와 5.6.6 | `accept/a_quoted_value_unquotes_its_pairs_and_keeps_its_commas`, `weigh/a_quoted_value_matches_the_same_value` |
| NG-2.2 (MT-2.2) | type, subtype, parameter 이름, `q`의 대소문자 | RFC 9110, 8.3.1, 5.6.6, 12.4.2 | `accept/names_and_q_are_read_in_lower_case`, `weigh/names_compare_without_regard_to_case` |
| NG-8.3 | `matching`이 `ignore`인 후보에 대한 range의 parameter | RFC 2045, 5.1 | `weigh/an_ignore_candidate_matches_whatever_the_parameters` |
| NG-8.4 (MT-5.2) | `charset` 값의 대소문자 | RFC 9110, 8.3.2 | `weigh/charset_values_compare_without_case` |

## 표준이 열어 둔 선택

다음 규칙은 RFC 9110이 정하지 않는 것을 정하며, 각각의 이유는 그 규칙이 적는다. NG-3.5(두 번 준 parameter는
실패한다, MT-3.5), NG-5.2(각 field line은 따로 읽는다), NG-8.4(`charset`만 알려진 대소문자 규칙을 가진다, MT-5.2와 MT-5.3), NG-9.1(parameter의
수를 구체성에 센다), NG-9.2(구체성이 같은 range 가운데서는 가장 높은 weight, 그 다음 field 순서).

## 폐기된 문장

NG-1.1, NG-1.3, NG-4와 NG-4.1부터 NG-4.4, NG-11.1은 폐기되었다. 이 라이브러리는 media type 값을 읽지 않으며, 그것은
http-media-type의 MT-4다. NG-1.4, NG-1.5, NG-11.3이 NG-1.1, NG-1.3, NG-11.1의 나머지를 적는다.
