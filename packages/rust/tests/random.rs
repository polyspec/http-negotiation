//! Random inputs: every byte string reads to ranges or to a kind, a written field reads back to its ranges whatever
//! its formatting, and the weights follow the definitions of NG-8 and NG-9, computed here from the rules directly.

use polyspec_http_media_type::Parameter;
use polyspec_http_negotiation::{Accept, Candidate, CandidateParameter, Error, Matching, Range, Weight};
use proptest::prelude::*;
use proptest::test_runner::TestCaseError;

const TYPES: [&str; 3] = ["text", "application", "image"];
const SUBTYPES: [&str; 3] = ["html", "plain", "vnd.x+json"];
const NAMES: [&str; 3] = ["a", "level", "charset"];
const VALUES: [&[u8]; 5] = [b"1", b"2", b"utf-8", b"UTF-8", b"a b\"\\\xe9"];

fn fail(error: Error) -> TestCaseError {
    TestCaseError::fail(error.to_string())
}

/// A weight, often one that another range has too, so that ties occur (NG-9.2).
fn weight() -> impl Strategy<Value = u64> {
    prop_oneof![Just(0u64), Just(500), Just(1000), 0u64..=1000]
}

/// A range of a small alphabet, so that ranges and candidates often match.
fn range() -> impl Strategy<Value = Range> {
    let form = prop_oneof![Just(0usize), Just(1), Just(2), Just(2), Just(2)];
    (form, 0..TYPES.len(), 0..SUBTYPES.len(), proptest::sample::subsequence(NAMES.to_vec(), 0..=2), weight())
        .prop_flat_map(|(form, r#type, subtype, names, weight)| {
            let values = proptest::collection::vec(0..VALUES.len(), names.len());
            (Just((form, r#type, subtype, names, weight)), values)
        })
        .prop_map(|((form, r#type, subtype, names, weight), values)| {
            let (r#type, subtype) = match form {
                0 => ("*", "*"),
                1 => (TYPES[r#type], "*"),
                _ => (TYPES[r#type], SUBTYPES[subtype]),
            };
            Range {
                r#type: r#type.to_owned(),
                subtype: subtype.to_owned(),
                parameters: names
                    .iter()
                    .zip(values)
                    .map(|(name, value)| Parameter { name: (*name).to_owned(), value: VALUES[value].to_vec() })
                    .collect(),
                weight,
            }
        })
}

fn candidate() -> impl Strategy<Value = Candidate> {
    let matching = prop_oneof![Just(Matching::Ignore), Just(Matching::Subset), Just(Matching::Exact)];
    let parameter = (0..NAMES.len(), proptest::sample::subsequence((0..VALUES.len()).collect::<Vec<_>>(), 1..=3));
    (0..TYPES.len(), 0..SUBTYPES.len(), proptest::collection::vec(parameter, 0..=2), matching, any::<bool>()).prop_map(
        |(r#type, subtype, parameters, matching, wildcards)| {
            let mut kept: Vec<CandidateParameter> = Vec::new();
            if matching != Matching::Ignore {
                for (name, values) in parameters {
                    let name = NAMES[name];
                    if kept.iter().any(|parameter| parameter.name == name) {
                        continue;
                    }
                    let mut served: Vec<Vec<u8>> = Vec::new();
                    for value in values {
                        let value = VALUES[value].to_vec();
                        if !served.iter().any(|other| same_value(name, other, &value)) {
                            served.push(value);
                        }
                    }
                    kept.push(CandidateParameter { name: name.to_owned(), values: served });
                }
            }
            Candidate {
                r#type: TYPES[r#type].to_owned(),
                subtype: SUBTYPES[subtype].to_owned(),
                parameters: kept,
                matching,
                wildcards,
            }
        },
    )
}

/// NG-8.4, written from the rule.
fn same_value(name: &str, left: &[u8], right: &[u8]) -> bool {
    if name == "charset" {
        left.eq_ignore_ascii_case(right)
    } else {
        left == right
    }
}

/// How one range is written: the case of its names, whitespace, quoting, empty parameters and the qvalue form.
#[derive(Debug, Clone)]
struct Style {
    upper: Vec<bool>,
    spaces: Vec<usize>,
    quote: Vec<bool>,
    empties: Vec<bool>,
    decimals: usize,
    weight_written: bool,
}

fn style() -> impl Strategy<Value = Style> {
    (
        proptest::collection::vec(any::<bool>(), 12),
        proptest::collection::vec(0usize..3, 12),
        proptest::collection::vec(any::<bool>(), 4),
        proptest::collection::vec(any::<bool>(), 4),
        0usize..=3,
        any::<bool>(),
    )
        .prop_map(|(upper, spaces, quote, empties, decimals, weight_written)| Style {
            upper,
            spaces,
            quote,
            empties,
            decimals,
            weight_written,
        })
}

fn flag(flags: &[bool], index: usize) -> bool {
    flags.get(index).copied().is_some_and(|value| value)
}

fn whitespace(style: &Style, index: usize) -> Vec<u8> {
    match style.spaces.get(index) {
        Some(1) => b" ".to_vec(),
        Some(2) => b" \t".to_vec(),
        _ => Vec::new(),
    }
}

fn cased(text: &str, upper: bool) -> Vec<u8> {
    if upper {
        text.to_ascii_uppercase().into_bytes()
    } else {
        text.as_bytes().to_vec()
    }
}

fn is_token(bytes: &[u8]) -> bool {
    !bytes.is_empty() && bytes.iter().all(|&byte| byte.is_ascii_alphanumeric() || b"!#$%&'*+-.^_`|~".contains(&byte))
}

/// The qvalue text of a weight in thousandths with at least `decimals` digits after the point (NG-6.1).
fn qvalue(weight: u64, decimals: usize) -> String {
    if weight == 1000 {
        return match decimals {
            0 => String::from("1"),
            places => format!("1.{}", "0".repeat(places)),
        };
    }
    let digits = format!("{weight:03}");
    let trimmed = digits.trim_end_matches('0');
    let places = trimmed.len().max(decimals);
    if places == 0 {
        return String::from("0");
    }
    format!("0.{}", &digits[..places])
}

/// Writes a range as `Accept` text in the given style (NG-2.2, NG-3, NG-5.5).
fn write(range: &Range, style: &Style) -> Vec<u8> {
    let mut out = Vec::new();
    out.extend(cased(&range.r#type, flag(&style.upper, 0)));
    out.push(b'/');
    out.extend(cased(&range.subtype, flag(&style.upper, 1)));
    for (index, parameter) in range.parameters.iter().enumerate() {
        out.extend(whitespace(style, index * 2));
        out.push(b';');
        out.extend(whitespace(style, index * 2 + 1));
        if flag(&style.empties, index) {
            out.push(b';');
        }
        out.extend(cased(&parameter.name, flag(&style.upper, index + 2)));
        out.push(b'=');
        if is_token(&parameter.value) && !flag(&style.quote, index) {
            out.extend(&parameter.value);
        } else {
            out.push(b'"');
            for &byte in &parameter.value {
                if byte == b'"' || byte == b'\\' || flag(&style.quote, index + 2) {
                    out.push(b'\\');
                }
                out.push(byte);
            }
            out.push(b'"');
        }
    }
    if range.weight != 1000 || style.weight_written {
        out.extend(whitespace(style, 10));
        out.push(b';');
        out.extend(whitespace(style, 11));
        out.extend(cased("q", flag(&style.upper, 5)));
        out.push(b'=');
        out.extend(qvalue(range.weight, style.decimals).into_bytes());
    }
    out
}

/// Writes ranges as one field line, with empty list elements before and after some of them (NG-5.3).
fn line(ranges: &[(Range, Style)], empties: &[bool]) -> Vec<u8> {
    let mut out = Vec::new();
    for (index, (range, style)) in ranges.iter().enumerate() {
        if flag(empties, index) {
            out.extend(b" ,\t");
        }
        if index > 0 {
            out.extend(b" , ");
        }
        out.extend(write(range, style));
    }
    if flag(empties, ranges.len()) {
        out.extend(b", ,");
    }
    out
}

/// The weight of a candidate, computed from NG-8 and NG-9 by listing every matching range with its specificity.
fn expected(ranges: &[Range], candidate: &Candidate) -> Result<Weight, TestCaseError> {
    let mut matching: Vec<(u8, usize, u64, usize)> = Vec::new();
    for (index, range) in ranges.iter().enumerate() {
        let form = if range.r#type == "*" && range.subtype == "*" {
            1
        } else if range.subtype == "*" && range.r#type == candidate.r#type {
            2
        } else if range.r#type == candidate.r#type && range.subtype == candidate.subtype {
            3
        } else {
            continue;
        };
        if form < 3 && !candidate.wildcards {
            continue;
        }
        let served = |parameter: &Parameter| {
            candidate.parameters.iter().any(|served| {
                served.name == parameter.name
                    && served.values.iter().any(|value| same_value(&served.name, value, &parameter.value))
            })
        };
        let named = |served: &CandidateParameter| range.parameters.iter().any(|p| p.name == served.name);
        let count = match candidate.matching {
            Matching::Ignore => 0,
            Matching::Subset if range.parameters.iter().all(served) => range.parameters.len(),
            Matching::Exact if range.parameters.iter().all(served) && candidate.parameters.iter().all(named) => {
                range.parameters.len()
            }
            Matching::Subset | Matching::Exact => continue,
        };
        matching.push((form, count, range.weight, index));
    }
    // The most specific, then the heaviest, then the first: the greatest key with the index reversed.
    match matching
        .into_iter()
        .max_by_key(|&(form, count, weight, index)| (form, count, weight, std::cmp::Reverse(index)))
    {
        None => Ok(Weight { weight: 0, range: None }),
        Some((_, _, weight, index)) => {
            let index = u64::try_from(index).map_err(|error| TestCaseError::fail(error.to_string()))?;
            Ok(Weight { weight, range: Some(index) })
        }
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(2000))]

    #[test]
    fn any_bytes_read_to_ranges_or_to_an_accept_kind(lines in proptest::collection::vec(proptest::collection::vec(any::<u8>(), 0..40), 0..3)) {
        // NG-5.7, NG-11
        match Accept::parse(&lines) {
            Ok(accept) => {
                for range in accept.ranges() {
                    prop_assert!(range.weight <= 1000);
                    prop_assert!(range.r#type != "*" || range.subtype == "*");
                }
            }
            Err(error) => prop_assert!(matches!(error, Error::InvalidAccept | Error::InvalidWeight), "{error:?}"),
        }
    }

    #[test]
    fn grammar_bytes_read_to_ranges_or_to_an_accept_kind(text in "[ \t,;=\"\\\\a-cqQ*/.0-9]{0,30}") {
        // NG-5.7: bytes of the grammar reach the deep paths of the reader.
        match Accept::parse(&[text.as_bytes()]) {
            Ok(accept) => prop_assert!(accept.ranges().iter().all(|range| range.weight <= 1000)),
            Err(error) => prop_assert!(matches!(error, Error::InvalidAccept | Error::InvalidWeight), "{error:?}"),
        }
    }

    #[test]
    fn a_written_field_reads_back_to_its_ranges(
        ranges in proptest::collection::vec((range(), style()), 0..5),
        empties in proptest::collection::vec(any::<bool>(), 6),
        split in 0usize..6,
    ) {
        // NG-1.5, NG-2.2, NG-3.2, NG-3.4, NG-5.2, NG-5.3, NG-6.2: case, whitespace, quoting, empty elements and
        // parameters and the split into lines change no range.
        let split = split.min(ranges.len());
        let (first, second) = ranges.split_at(split);
        let mut lines = vec![line(first, &empties)];
        if !second.is_empty() {
            lines.push(line(second, &[]));
        }
        let accept = Accept::parse(&lines).map_err(fail)?;
        let expected: Vec<Range> = ranges.into_iter().map(|(range, _)| range).collect();
        prop_assert_eq!(accept.ranges(), &expected[..]);
    }

    #[test]
    fn weights_follow_the_rules(
        ranges in proptest::collection::vec((range(), style()), 0..6),
        candidates in proptest::collection::vec(candidate(), 0..5),
    ) {
        // NG-8.1 to NG-8.4, NG-9.1, NG-9.2, NG-10.1, NG-10.2
        let accept = Accept::parse(&[line(&ranges, &[])]).map_err(fail)?;
        let weights = accept.weigh(&candidates).map_err(fail)?;
        let expected =
            candidates.iter().map(|candidate| expected(accept.ranges(), candidate)).collect::<Result<Vec<_>, _>>()?;
        prop_assert_eq!(&weights, &expected);
        // NG-10.1: each candidate is weighed on its own.
        for (candidate, weight) in candidates.iter().zip(&weights) {
            prop_assert_eq!(accept.weigh(std::slice::from_ref(candidate)).map_err(fail)?, vec![*weight]);
        }
    }

}
