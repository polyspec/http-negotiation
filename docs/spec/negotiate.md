<!-- doc-id: spec-negotiate -->
# http-negotiation specification

This library reads `Accept` field values of HTTP and gives each candidate media type of a list the weight that an
`Accept` value gives it. It does not choose a candidate, does not order candidates of equal weight, does
not decide which candidates exist and writes no response: the caller owns those decisions. Every rule below is in the
Rust core `packages/rust`; a binding converts types and holds no rule. A media type is read and written by the
dependency http-media-type, whose rules `MT-n` define the tokens, quoted strings and parameters that a media range is
written in and the comparison of parameter values; this specification points to them and does not define them again.

The standard is RFC 9110 (HTTP Semantics), with its verified erratum 7138 to section 12.5.1, and the sections that
each rule names. A rule is a list item `**NG-n**`; its numbered statements are `NG-n.m`, and a test names the
statements it checks.

## Text

- **NG-1** Input and output text.
  1. NG-1.4 A field line value and a parameter value of a range are bytes, one character per byte (`latin1` of the
     interface contract; MT-1.1). Bytes 0x80 to 0xFF are `obs-text` (RFC 9110, section 5.5).
  2. NG-1.2 A type, a subtype and a parameter name are tokens and so ASCII; the library returns them in lowercase.
  3. NG-1.5 SP and HTAB before the first and after the last other byte of a field line value are not part of the value
     (RFC 9110, section 5.5) and are ignored.

- **NG-2** Tokens and case.
  1. NG-2.1 A token is a token of MT-2.1 (RFC 9110, section 5.6.2).
  2. NG-2.2 Types, subtypes and parameter names compare without regard to ASCII case (MT-2.2), and so does the weight
     name `q` (RFC 9110, section 12.4.2, and RFC 5234, section 2.3, for the literal `"q="`).

- **NG-3** The parameters of a media range are the parameters of MT-3 (RFC 9110, section 5.6.6), read by the parameter
  reader of MT-7 with the stop name `q` (NG-5.5).
  1. NG-3.1 Their grammar, without whitespace around `=`, is MT-3.1.
  2. NG-3.2 An empty parameter, also one followed by the `,` that ends a list element, gives nothing (MT-3.2).
  3. NG-3.3 A quoted string is that of MT-3.3; one without its closing `"` fails.
  4. NG-3.4 The value of a parameter is its bytes without quoting (MT-3.4).
  5. NG-3.5 Two parameters of one range with the same name fail (MT-3.5).
  6. NG-3.6 Parameters keep the order in which the field gives them (MT-3.6).

## Accept

- **NG-5** `Accept.parse(lines)` reads an `Accept` field (RFC 9110, section 12.5.1).
  1. NG-5.1 The field is given as its field line values in order. No field line means that the field is absent, which
     is one range `*/*` of weight 1000 without parameters: a request without the field states no preference
     (RFC 9110, sections 12.4.1 and 12.5.1).
  2. NG-5.2 Each field line value is a list `#( media-range [ weight ] )` (RFC 9110, sections 5.6.1 and 12.5.1), and
     the ranges of the field are the ranges of its lines in line order. Each line is read on its own, so a quoted string
     does not continue into the next line: a field line of a list field is itself a list, which is what allows a
     recipient to join the lines with a comma (RFC 9110, section 5.3).
  3. NG-5.3 Empty list elements and the whitespace around `,` are ignored (RFC 9110, section 5.6.1.2). A field whose
     lines hold no range, such as one empty line, is the empty list, which matches no candidate.
  4. NG-5.4 `media-range = ( "*/*" / ( type "/" "*" ) / ( type "/" subtype ) ) parameters`. A range `*/subtype`
     fails. A type or subtype is `*` only when it is that one byte; another token that holds `*` names a type.
  5. NG-5.5 The first parameter named `q` (NG-2.2) is the weight, `weight = OWS ";" OWS "q=" qvalue`, and is no
     parameter of the range. It ends its range: anything but whitespace before the next `,` or the end of the line
     after it fails, because RFC 9110 defines nothing after the weight (section 12.5.1; appendix B.3 records the removal
     of accept extensions).
  6. NG-5.6 A range without a weight has weight 1000.
  7. NG-5.7 A field line that does not follow NG-3 and NG-5 fails with kind `invalid_accept`, and a weight whose value
     is not a `qvalue` (NG-6) fails with kind `invalid_weight` (NG-11). One failing line fails the field.

- **NG-6** Weights (RFC 9110, section 12.4.2).
  1. NG-6.1 `qvalue = ( "0" [ "." 0*3DIGIT ] ) / ( "1" [ "." 0*3("0") ] )`, as the bytes up to the next whitespace,
     `;`, `,` or end of the line; a quoted qvalue is no qvalue.
  2. NG-6.2 A weight is an integer in thousandths from 0 to 1000: `0.5` is 500, `0.05` is 50, `1.` and `1.000` are
     1000. The value is exact; no binary fraction is involved.
  3. NG-6.3 Weight 0 means not acceptable (RFC 9110, section 12.4.2).

## Weighing candidates

- **NG-7** A candidate is a media type that the caller can serve, with the way ranges match it.
  1. NG-7.1 A candidate has `type` and `subtype`, `parameters` (each a name and the nonempty list of the values that the
     candidate serves for it), `matching` (NG-8.3) and `wildcards` (NG-8.2).
  2. NG-7.2 The type and subtype are tokens other than `*` (MT-4.2); a parameter name is a token other than `q`
     (MT-4.3), and two names equal by NG-2.2 fail (NG-3.5). Case does not matter (NG-2.2).
  3. NG-7.3 A value holds only HTAB, SP and the bytes 0x21 to 0x7E and 0x80 to 0xFF, the bytes that a quoted string can
     carry (MT-3.3), so that some range can name it; the empty value is valid. Two values of one parameter that are
     equal by NG-8.4 fail.
  4. NG-7.4 A candidate with `matching` `ignore` and a parameter fails, because its parameters would never be compared
     (NG-8.3).
  5. NG-7.5 A candidate that breaks NG-7.2 to NG-7.4 fails with kind `invalid_candidate` (NG-11), and the whole call
     fails.

- **NG-8** A range matches a candidate when all of these hold.
  1. NG-8.1 The type of the range is `*` or the type of the candidate, and its subtype is `*` or the subtype of the
     candidate (RFC 9110, section 12.5.1).
  2. NG-8.2 A range whose type or subtype is `*` matches only a candidate with `wildcards` true.
  3. NG-8.3 By `matching` of the candidate: `ignore`, the candidate's type defines no parameters, and the parameters
     of the range are not compared, as a recipient ignores parameters that it does not recognize (RFC 2045, section
     5.1); `subset`, every parameter of the range is a parameter of the candidate with one of its values (RFC 9110,
     section 12.5.1: `text/plain;format=flowed` does not apply to `text/plain`); `exact`, as `subset`, and every
     parameter of the candidate is also a parameter of the range.
  4. NG-8.4 A value of a range equals a value of a candidate when the two are the same value of their parameter by
     MT-5: equal bytes after NG-3.4, so quoting does not matter (MT-5.1), the values of `charset` without regard to
     ASCII case (MT-5.2) and every other value exactly (MT-5.3).

- **NG-9** The range that decides the weight of a candidate.
  1. NG-9.1 The specificity of a matching range is first its form, `type/subtype` above `type/*` above `*/*`, and then
     the number of its parameters, which counts only for a candidate whose `matching` is `subset` or `exact`
     (RFC 9110, section 12.5.1: "the most specific reference has precedence").
  2. NG-9.2 Among the matching ranges the most specific decides; among equally specific ones the one of highest
     weight; among those the first in field order.

- **NG-10** `Accept.weigh(candidates)` gives one result for each candidate, in candidate order.
  1. NG-10.1 A result is the weight of the deciding range (NG-9) and the index of that range in `Accept.ranges()`.
  2. NG-10.2 A candidate that no range matches has weight 0 and no index (null); that is the only reason for a missing
     index. A candidate whose deciding range has weight 0 has weight 0 and that range's index.
  3. NG-10.3 The parameters of the deciding range are read from `Accept.ranges()` by the index.
  4. NG-10.4 The library takes no candidate and orders no equal weights: that is a decision of the caller.

## Errors and runtime

- **NG-11** Every failure is an error with a kind; no function returns a placeholder value for a failure.

  | Kind | Status | Category | When |
  |---|---|---|---|
  | `invalid_accept` | 400 | value | NG-5.7, a field line that does not follow the grammar |
  | `invalid_weight` | 400 | value | NG-5.7, a weight that is not a qvalue |
  | `invalid_candidate` | none | value | NG-7.5 |
  | `internal` | none | internal | an index that does not fit the integer of the interface; it cannot happen in memory |

  1. NG-11.3 An `Accept` field is always a request field, so its two failures carry status 400, malformed request
     syntax (RFC 9110, section 15.5.1). A candidate comes from the caller, which decides the status.
  2. NG-11.2 The message of an error is the fixed sentence of its kind and names no input.
  3. NG-11.4 No input reaches the kind `internal`, so a fault injection point gives it (binding design G-5, X-1): the
     point `http_negotiation.internal`, with the injection `broken`, makes `Accept::weigh` treat the index of the range
     that decides a candidate as an index that does not fit the integer of the interface. The case
     `a_broken_index_is_internal` of the group `internal`, which only `Accept::weigh` reads, arms it and checks the
     kind, the category and the status; a generated binding test checks the error class of each target with it. The
     point does nothing unless the feature `fault-test` of the core is on, which only tests turn on.

     | id | Place (function) | inject | fills | Rule id of the imitated condition | Does the arming carry over |
     |---|---|---|---|---|---|
     | `internal` | `Accept::weigh` | `broken` | `internal` | NG-11 | no task or thread is started: the call runs on the thread of its entry point |

- **NG-12** Every function is pure: no I/O, no state between calls, no wait (`wait: none` of the interface contract).
  1. NG-12.1 Every type is `Send + Sync` and needs at most 16 bytes of alignment.
  2. NG-12.2 No input size is limited here: the library reads every byte that it is given, in time linear in the
     field length, and weighing takes time proportional to the number of ranges times the number of candidates. The
     host bounds the size of a field (RFC 9110, section 5.6.1.2: "a reasonable number of empty list elements").

## Inputs ignored

Each row is an input that changes no result; the case named in the last column shows it.

| Rule | Bytes ignored | Basis | Case |
|---|---|---|---|
| NG-1.5 | SP and HTAB around a field line value | RFC 9110, 5.5 | `accept/white_space_around_a_line_is_ignored` |
| NG-5.3 | empty list elements and the whitespace around `,` | RFC 9110, 5.6.1.2 | `accept/empty_list_elements_are_ignored` |
| NG-3.2 (MT-3.2) | empty parameters and the whitespace around `;` | RFC 9110, 5.6.6 and B.3 | `accept/empty_parameters_are_ignored`, `accept/a_trailing_semicolon_is_an_empty_parameter` |
| NG-3.4 (MT-3.4) | the quotes of a quoted value and the backslash of a quoted pair | RFC 9110, 5.6.4 and 5.6.6 | `accept/a_quoted_value_unquotes_its_pairs_and_keeps_its_commas`, `weigh/a_quoted_value_matches_the_same_value` |
| NG-2.2 (MT-2.2) | the case of a type, a subtype, a parameter name and `q` | RFC 9110, 8.3.1, 5.6.6 and 12.4.2 | `accept/names_and_q_are_read_in_lower_case`, `weigh/names_compare_without_regard_to_case` |
| NG-8.3 | the parameters of a range for a candidate whose `matching` is `ignore` | RFC 2045, 5.1 | `weigh/an_ignore_candidate_matches_whatever_the_parameters` |
| NG-8.4 (MT-5.2) | the case of a `charset` value | RFC 9110, 8.3.2 | `weigh/charset_values_compare_without_case` |

## Choices that the standard leaves open

These rules decide what RFC 9110 does not, each for the reason that its rule states: NG-3.5 (a parameter given twice
fails, MT-3.5), NG-5.2 (each field line is read on its own), NG-8.4 (only `charset` has a known case rule, MT-5.2 and MT-5.3), NG-9.1 (the number
of parameters counts in specificity) and NG-9.2 (highest weight, then field order, among equally specific ranges).

## Retired statements

NG-1.1, NG-1.3, NG-4 with NG-4.1 to NG-4.4 and NG-11.1 are retired: this library reads no media type value, which is
MT-4 of http-media-type, and NG-1.4, NG-1.5 and NG-11.3 state the rest of NG-1.1, NG-1.3 and NG-11.1.
