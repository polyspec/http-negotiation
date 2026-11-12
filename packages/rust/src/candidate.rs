//! Candidates and their weights (NG-7 to NG-10). Two values are equal by NG-8.4.

use polyspec_http_media_type::grammar::{is_quotable, is_token, lowercase};
use polyspec_http_media_type::same_value;

use crate::{Accept, Error, Range};

/// How the parameters of a range match a candidate (NG-8.3).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Matching {
    /// The candidate's type defines no parameters; the parameters of a range are not compared.
    Ignore,
    /// Every parameter of a range is a parameter of the candidate with one of its values.
    Subset,
    /// As `Subset`, and every parameter of the candidate is a parameter of the range.
    Exact,
}

/// A parameter of a candidate: its name and the values that the candidate serves for it (NG-7.1).
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct CandidateParameter {
    pub name: String,
    pub values: Vec<Vec<u8>>,
}

/// A media type that the caller can serve, with the way ranges match it (NG-7.1). `weigh` checks it (NG-7.2 to
/// NG-7.5).
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Candidate {
    pub r#type: String,
    pub subtype: String,
    pub parameters: Vec<CandidateParameter>,
    pub matching: Matching,
    pub wildcards: bool,
}

/// The weight of one candidate and the index of the range that decides it, none when no range matches (NG-10.1,
/// NG-10.2).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Weight {
    pub weight: u64,
    pub range: Option<u64>,
}

/// A checked candidate with its names in lowercase.
struct Checked<'a> {
    r#type: String,
    subtype: String,
    parameters: Vec<(String, &'a [Vec<u8>])>,
    matching: Matching,
    wildcards: bool,
}

impl Accept {
    /// Gives each candidate, in order, the weight of the range that decides it (NG-10).
    pub fn weigh(&self, candidates: &[Candidate]) -> Result<Vec<Weight>, Error> {
        // NG-7.5: one invalid candidate fails the whole call, before any weight.
        let checked = candidates.iter().map(check).collect::<Result<Vec<_>, _>>()?;
        checked.iter().map(|candidate| self.weight_of(candidate)).collect()
    }

    fn weight_of(&self, candidate: &Checked<'_>) -> Result<Weight, Error> {
        // NG-9.2: the most specific, then the heaviest, then the first.
        let mut best: Option<(usize, (u8, usize), u64)> = None;
        for (index, range) in self.ranges().iter().enumerate() {
            let Some(specificity) = specificity(range, candidate) else { continue };
            let better = match best {
                None => true,
                Some((_, best_specificity, best_weight)) => {
                    specificity > best_specificity || (specificity == best_specificity && range.weight > best_weight)
                }
            };
            if better {
                best = Some((index, specificity, range.weight));
            }
        }
        match best {
            // NG-10.2: no range matches.
            None => Ok(Weight { weight: 0, range: None }),
            Some((index, _, weight)) => {
                let index = u64::try_from(index).map_err(|_overflow| Error::Internal)?;
                Ok(Weight { weight, range: Some(index) })
            }
        }
    }
}

/// The specificity of a range that matches the candidate, none when it does not match (NG-8, NG-9.1).
fn specificity(range: &Range, candidate: &Checked<'_>) -> Option<(u8, usize)> {
    let form = match (range.r#type.as_str(), range.subtype.as_str()) {
        ("*", "*") => 1,
        (r#type, "*") if r#type == candidate.r#type => 2,
        (r#type, subtype) if r#type == candidate.r#type && subtype == candidate.subtype => 3,
        _ => return None,
    };
    // NG-8.2
    if form < 3 && !candidate.wildcards {
        return None;
    }
    let counted = match candidate.matching {
        // NG-8.3: the parameters of the range are not compared and count for nothing.
        Matching::Ignore => 0,
        Matching::Subset | Matching::Exact => {
            let all_served = range.parameters.iter().all(|parameter| {
                candidate.parameters.iter().any(|(name, values)| {
                    *name == parameter.name && values.iter().any(|value| same_value(name, value, &parameter.value))
                })
            });
            if !all_served {
                return None;
            }
            // The names of both sides are distinct (NG-3.5, NG-7.2), so equal counts make equal name sets.
            if candidate.matching == Matching::Exact && range.parameters.len() != candidate.parameters.len() {
                return None;
            }
            range.parameters.len()
        }
    };
    Some((form, counted))
}

/// Checks a candidate (NG-7.2 to NG-7.4).
fn check(candidate: &Candidate) -> Result<Checked<'_>, Error> {
    let r#type = name(&candidate.r#type)?;
    let subtype = name(&candidate.subtype)?;
    if r#type == "*" || subtype == "*" {
        return Err(Error::InvalidCandidate);
    }
    if candidate.matching == Matching::Ignore && !candidate.parameters.is_empty() {
        return Err(Error::InvalidCandidate);
    }
    let mut parameters: Vec<(String, &[Vec<u8>])> = Vec::with_capacity(candidate.parameters.len());
    for parameter in &candidate.parameters {
        let name = name(&parameter.name)?;
        if name == "q" || parameters.iter().any(|(other, _)| *other == name) || parameter.values.is_empty() {
            return Err(Error::InvalidCandidate);
        }
        for (index, value) in parameter.values.iter().enumerate() {
            if !value.iter().all(|&byte| is_quotable(byte)) {
                return Err(Error::InvalidCandidate);
            }
            let earlier = parameter.values.get(..index).ok_or(Error::Internal)?;
            if earlier.iter().any(|other| same_value(&name, other, value)) {
                return Err(Error::InvalidCandidate);
            }
        }
        parameters.push((name, &parameter.values));
    }
    Ok(Checked { r#type, subtype, parameters, matching: candidate.matching, wildcards: candidate.wildcards })
}

/// A token of a candidate in lowercase (NG-7.2).
fn name(text: &str) -> Result<String, Error> {
    if is_token(text.as_bytes()) {
        Ok(lowercase(text.as_bytes()))
    } else {
        Err(Error::InvalidCandidate)
    }
}
