//! Runs every case of `contracts/negotiate.json` and checks that the cases and the tests cite the rules of
//! `docs/spec/negotiate.md`.
//!
//! A text of the cases is bytes, one character per byte (NG-1.4): a character above U+00FF in a case is a defect of
//! the case. A failure is the object `raises` (kind, status, category, message).

use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

use polyspec_http_media_type::Parameter;
use polyspec_http_negotiation::{Accept, Candidate, CandidateParameter, Error, Matching, Range, Weight};
use serde_json::{json, Value};

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn read_json(path: &Path) -> Result<Value, String> {
    let text = fs::read_to_string(path).map_err(|error| format!("{}: {error}", path.display()))?;
    serde_json::from_str(&text).map_err(|error| format!("{}: {error}", path.display()))
}

fn cases() -> Result<Value, String> {
    read_json(&root().join("contracts/negotiate.json"))
}

fn group<'a>(cases: &'a Value, name: &str) -> Result<&'a Vec<Value>, String> {
    cases.get(name).and_then(Value::as_array).ok_or(format!("no group {name}"))
}

fn field<'a>(value: &'a Value, name: &str) -> Result<&'a Value, String> {
    value.get(name).ok_or(format!("no field {name} in {value}"))
}

fn string<'a>(value: &'a Value, name: &str) -> Result<&'a str, String> {
    field(value, name)?.as_str().ok_or(format!("{name} is no string in {value}"))
}

fn array<'a>(value: &'a Value, name: &str) -> Result<&'a Vec<Value>, String> {
    field(value, name)?.as_array().ok_or(format!("{name} is no array in {value}"))
}

fn latin1(value: &Value) -> Result<Vec<u8>, String> {
    let text = value.as_str().ok_or(format!("{value} is no string"))?;
    text.chars().map(|c| u8::try_from(u32::from(c)).map_err(|error| format!("{c:?} in {text:?}: {error}"))).collect()
}

fn text(bytes: &[u8]) -> String {
    bytes.iter().map(|&byte| char::from(byte)).collect()
}

/// The category of a kind (NG-11).
fn category(error: Error) -> &'static str {
    match error {
        Error::InvalidAccept | Error::InvalidWeight | Error::InvalidCandidate => "value",
        Error::Internal => "internal",
    }
}

fn raises(error: Error) -> Value {
    json!({"kind": error.kind(), "status": error.status(), "category": category(error), "message": null})
}

fn parameters_of(parameters: &[Parameter]) -> Value {
    Value::Array(
        parameters.iter().map(|parameter| json!({"name": parameter.name, "value": text(&parameter.value)})).collect(),
    )
}

fn ranges_of(ranges: &[Range]) -> Value {
    Value::Array(
        ranges
            .iter()
            .map(|range| {
                json!({
                    "type": range.r#type,
                    "subtype": range.subtype,
                    "parameters": parameters_of(&range.parameters),
                    "weight": range.weight,
                })
            })
            .collect(),
    )
}

fn weights_of(weights: &[Weight]) -> Value {
    Value::Array(weights.iter().map(|weight| json!({"weight": weight.weight, "range": weight.range})).collect())
}

fn lines(case: &Value) -> Result<Vec<Vec<u8>>, String> {
    array(case, "lines")?.iter().map(latin1).collect()
}

fn candidate(value: &Value) -> Result<Candidate, String> {
    let matching = match string(value, "matching")? {
        "ignore" => Matching::Ignore,
        "subset" => Matching::Subset,
        "exact" => Matching::Exact,
        other => return Err(format!("no matching {other}")),
    };
    let parameters = array(value, "parameters")?
        .iter()
        .map(|parameter| {
            Ok(CandidateParameter {
                name: string(parameter, "name")?.to_owned(),
                values: array(parameter, "values")?.iter().map(latin1).collect::<Result<_, _>>()?,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    Ok(Candidate {
        r#type: string(value, "type")?.to_owned(),
        subtype: string(value, "subtype")?.to_owned(),
        parameters,
        matching,
        wildcards: field(value, "wildcards")?.as_bool().ok_or(format!("wildcards is no bool in {value}"))?,
    })
}

/// Calls a member under the faults that a case arms, as a generated binding test does (binding design G-5, NG-11.4):
/// it arms the list for the member, the call takes the arming as the entry point of the member does, and a fault that
/// did not fire fails the case. A case without `faults` calls the member with no arming.
fn armed<T>(case: &Value, member: &str, call: impl FnOnce() -> T) -> Result<T, String> {
    let Some(faults) = case.get("faults") else { return Ok(call()) };
    let id = binding_core::fault::arm(member, &faults.to_string()).map_err(|error| error.to_string())?;
    let outcome = binding_core::fault::take(member).run(call);
    let left = binding_core::fault::left(id).map_err(|error| error.to_string())?;
    if left.is_empty() {
        Ok(outcome)
    } else {
        Err(format!("{}: the faults of {} did not fire", string(case, "id")?, left.join(", ")))
    }
}

/// Compares the one result key of a case, `raises` or `expected_key`, with the outcome.
fn compare<T>(
    failures: &mut Vec<String>,
    case: &Value,
    expected_key: &str,
    outcome: Result<T, Error>,
    to_json: impl Fn(&T) -> Value,
) -> Result<(), String> {
    let id = string(case, "id")?;
    let (key, actual) = match &outcome {
        Ok(value) => (expected_key, to_json(value)),
        Err(error) => ("raises", raises(*error)),
    };
    for other in [expected_key, "raises"] {
        if other != key && case.get(other).is_some() {
            failures.push(format!("{id}: expected {other} {}, got {key} {actual}", field(case, other)?));
            return Ok(());
        }
    }
    let expected = field(case, key)?;
    if *expected != actual {
        failures.push(format!("{id}: {key}: expected {expected}, got {actual}"));
    }
    Ok(())
}

#[test]
fn accept_cases() -> Result<(), String> {
    let cases = cases()?;
    let mut failures = Vec::new();
    for case in group(&cases, "accept")? {
        let outcome = Accept::parse(&lines(case)?);
        compare(&mut failures, case, "ranges", outcome, |accept| ranges_of(accept.ranges()))?;
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
    Ok(())
}

#[test]
fn weigh_cases() -> Result<(), String> {
    let cases = cases()?;
    let mut failures = Vec::new();
    for case in group(&cases, "weigh")? {
        let candidates = array(case, "candidates")?.iter().map(candidate).collect::<Result<Vec<_>, _>>()?;
        let outcome = match Accept::parse(&lines(case)?) {
            Ok(accept) => armed(case, "accept.weigh", || accept.weigh(&candidates))?,
            Err(error) => Err(error),
        };
        compare(&mut failures, case, "weights", outcome, |weights| weights_of(weights))?;
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
    Ok(())
}

#[test]
fn invalid_candidate_cases() -> Result<(), String> {
    // NG-7.5: an invalid candidate fails the whole call, also after a valid one: a case gives a valid candidate and then
    // the invalid one, and the invalid one alone fails the same way.
    let cases = cases()?;
    let mut failures = Vec::new();
    for case in group(&cases, "invalidCandidates")? {
        let accept = Accept::parse(&lines(case)?).map_err(|error| error.to_string())?;
        let candidates = array(case, "candidates")?.iter().map(candidate).collect::<Result<Vec<_>, _>>()?;
        let invalid = candidates.last().ok_or(format!("no candidate in {case}"))?.clone();
        for candidates in [vec![invalid], candidates] {
            compare(&mut failures, case, "weights", accept.weigh(&candidates), |weights| weights_of(weights))?;
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
    Ok(())
}

/// The rule and statement ids that the spec defines: `**NG-n**` and the numbered `NG-n.m`.
fn defined_ids() -> Result<BTreeSet<String>, String> {
    let spec = fs::read_to_string(root().join("docs/spec/negotiate.md")).map_err(|error| error.to_string())?;
    let mut ids = BTreeSet::new();
    for line in spec.lines() {
        let line = line.trim_start();
        if let Some(rest) = line.strip_prefix("- **") {
            if let Some((id, _)) = rest.split_once("**") {
                ids.insert(id.to_owned());
            }
        } else if let Some((number, rest)) = line.split_once(". ") {
            if !number.is_empty() && number.chars().all(|c| c.is_ascii_digit()) && rest.starts_with("NG-") {
                if let Some((id, _)) = rest.split_once(' ') {
                    ids.insert(id.to_owned());
                }
            }
        }
    }
    Ok(ids)
}

/// Every `NG-n` or `NG-n.m` in a text.
fn cited_ids(text: &str) -> BTreeSet<String> {
    let mut ids = BTreeSet::new();
    let bytes = text.as_bytes();
    let mut start = 0;
    while let Some(offset) = text.get(start..).and_then(|rest| rest.find("NG-")) {
        let begin = start + offset;
        let mut end = begin + 3;
        let mut seen_point = false;
        while let Some(&byte) = bytes.get(end) {
            let next_is_digit = bytes.get(end + 1).is_some_and(u8::is_ascii_digit);
            if byte.is_ascii_digit() || (byte == b'.' && !seen_point && next_is_digit) {
                seen_point |= byte == b'.';
                end += 1;
            } else {
                break;
            }
        }
        if end > begin + 3 {
            if let Some(id) = text.get(begin..end) {
                ids.insert(id.to_owned());
            }
        }
        start = end;
    }
    ids
}

#[test]
fn cases_cite_the_rules_of_the_spec() -> Result<(), String> {
    let defined = defined_ids()?;
    let cases = cases()?;
    let mut failures = Vec::new();
    let mut ids = BTreeSet::new();
    for name in ["accept", "weigh", "invalidCandidates"] {
        for case in group(&cases, name)? {
            let id = string(case, "id")?;
            if !ids.insert(format!("{name}/{id}")) {
                failures.push(format!("{name}/{id}: the id is not unique"));
            }
            let rules = array(case, "rules")?;
            if rules.is_empty() {
                failures.push(format!("{name}/{id}: no rule"));
            }
            for rule in rules {
                let rule = rule.as_str().ok_or(format!("{name}/{id}: a rule is no string"))?;
                if !defined.contains(rule) {
                    failures.push(format!("{name}/{id}: {rule} is not in the spec"));
                }
            }
        }
    }
    // The table of ignored inputs names its cases as `<group>/<id>`.
    let spec = fs::read_to_string(root().join("docs/spec/negotiate.md")).map_err(|error| error.to_string())?;
    let table = spec.split("## Inputs ignored").nth(1).and_then(|rest| rest.split("\n## ").next()).ok_or("no table")?;
    for cell in table.split('`').skip(1).step_by(2).filter(|cell| cell.contains('/') && cell.contains('_')) {
        if !ids.contains(cell) {
            failures.push(format!("the table of ignored inputs names {cell}, which is no case"));
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
    Ok(())
}

#[test]
fn every_statement_is_cited() -> Result<(), String> {
    let defined = defined_ids()?;
    let mut cited = cited_ids(&fs::read_to_string(root().join("contracts/negotiate.json")).map_err(|e| e.to_string())?);
    for folder in ["packages/rust/src", "packages/rust/tests"] {
        for entry in fs::read_dir(root().join(folder)).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if path.extension().is_some_and(|extension| extension == "rs") {
                cited.extend(cited_ids(&fs::read_to_string(&path).map_err(|error| error.to_string())?));
            }
        }
    }
    let statements = defined.iter().filter(|id| id.contains('.'));
    let missing: Vec<&String> = statements.filter(|id| !cited.contains(*id)).collect();
    assert!(missing.is_empty(), "no case or test cites {missing:?}");
    let unknown: Vec<&String> = cited.iter().filter(|id| !defined.contains(*id)).collect();
    assert!(unknown.is_empty(), "the cases or tests cite {unknown:?}, which the spec does not define");
    Ok(())
}
