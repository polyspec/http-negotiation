//! The `Accept` field (NG-5, NG-6).

use crate::syntax::{lowercase, trim_ows, Cursor, Fault, Q};
use crate::{Error, Parameter};

/// The weight of a range without a weight, and of the range that an absent field stands for (NG-5.1, NG-5.6).
pub const FULL_WEIGHT: u64 = 1000;

/// A media range of `Accept`: type and subtype in lowercase, `*` for a wildcard, its parameters in order and its
/// weight in thousandths (NG-5.4 to NG-6.2).
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Range {
    pub r#type: String,
    pub subtype: String,
    pub parameters: Vec<Parameter>,
    pub weight: u64,
}

/// A read `Accept` field: its ranges in field order (NG-5).
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Accept {
    ranges: Vec<Range>,
}

impl Accept {
    /// Reads the field from its field line values in order; no line means the field is absent (NG-5.1).
    pub fn parse<L: AsRef<[u8]>>(lines: &[L]) -> Result<Accept, Error> {
        if lines.is_empty() {
            return Ok(Accept {
                ranges: vec![Range {
                    r#type: String::from("*"),
                    subtype: String::from("*"),
                    parameters: Vec::new(),
                    weight: FULL_WEIGHT,
                }],
            });
        }
        let mut ranges = Vec::new();
        for line in lines {
            // NG-5.2: each line is a list of its own.
            read_line(trim_ows(line.as_ref()), &mut ranges).map_err(|fault| match fault {
                Fault::Grammar => Error::InvalidAccept,
                Fault::Weight => Error::InvalidWeight,
            })?;
        }
        Ok(Accept { ranges })
    }

    /// The ranges in field order (NG-10.3).
    pub fn ranges(&self) -> &[Range] {
        &self.ranges
    }
}

/// Reads one field line value, a list `#( media-range [ weight ] )` (NG-5.2 to NG-5.5).
fn read_line(line: &[u8], ranges: &mut Vec<Range>) -> Result<(), Fault> {
    let mut cursor = Cursor::new(line);
    loop {
        cursor.skip_ows();
        match cursor.peek() {
            None => return Ok(()),
            // NG-5.3: an empty list element gives nothing.
            Some(b',') => {
                cursor.eat(b',');
                continue;
            }
            Some(_) => {}
        }
        ranges.push(read_range(&mut cursor)?);
        cursor.skip_ows();
        match cursor.peek() {
            None => return Ok(()),
            Some(b',') => {
                cursor.eat(b',');
            }
            // NG-5.5: nothing but whitespace follows a weight or the last parameter before the comma.
            Some(_) => return Err(Fault::Grammar),
        }
    }
}

/// Reads `media-range [ weight ]` (NG-5.4, NG-5.5).
fn read_range(cursor: &mut Cursor<'_>) -> Result<Range, Fault> {
    let r#type = cursor.token()?;
    if !cursor.eat(b'/') {
        return Err(Fault::Grammar);
    }
    let subtype = cursor.token()?;
    // NG-5.4: `*/subtype` is no media range.
    if r#type == b"*" && subtype != b"*" {
        return Err(Fault::Grammar);
    }
    let (parameters, weight) = cursor.parameters(true)?;
    let weight = match weight {
        Q::None => FULL_WEIGHT,
        Q::Thousandths(thousandths) => u64::from(thousandths),
    };
    Ok(Range { r#type: lowercase(r#type), subtype: lowercase(subtype), parameters, weight })
}
