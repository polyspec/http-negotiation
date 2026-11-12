//! The `Accept` field (NG-5, NG-6).

use polyspec_http_media_type::grammar::{is_ows, lowercase, trim_ows, Cursor, Ending, Malformed};
use polyspec_http_media_type::Parameter;

use crate::Error;

/// The weight of a range without a weight, and of the range that an absent field stands for (NG-5.1, NG-5.6).
pub const FULL_WEIGHT: u64 = 1000;

/// The weight name, which ends the parameters of a range (NG-5.5).
const WEIGHT: &str = "q";

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

/// A failure of one field line, which `Accept::parse` turns into its kind (NG-5.7).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Fault {
    /// The bytes do not follow the grammar.
    Grammar,
    /// The value of the weight `q` is not a qvalue (NG-6.1).
    Weight,
}

impl From<Malformed> for Fault {
    fn from(Malformed: Malformed) -> Self {
        Fault::Grammar
    }
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
            // NG-5.2: each line is a list of its own; NG-1.5: the whitespace around it is ignored.
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

/// Reads `media-range [ weight ]` (NG-5.4, NG-5.5); the parameters are those of NG-3.
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
    // NG-5.5: the first parameter named q, in any case (NG-2.2), is the weight and ends the range.
    let (parameters, ending) = cursor.parameters(WEIGHT)?;
    let weight = match ending {
        Ending::Parameters => FULL_WEIGHT,
        Ending::Stop => {
            let word = cursor.run(|byte| !is_ows(byte) && byte != b';' && byte != b',');
            u64::from(qvalue(word).ok_or(Fault::Weight)?)
        }
    };
    Ok(Range { r#type: lowercase(r#type), subtype: lowercase(subtype), parameters, weight })
}

/// The weight of a qvalue in thousandths, or none when the bytes are no qvalue (NG-6.1, NG-6.2).
fn qvalue(bytes: &[u8]) -> Option<u16> {
    let (first, rest) = bytes.split_first()?;
    let decimals = match rest.split_first() {
        None => &[][..],
        Some((b'.', decimals)) if decimals.len() <= 3 => decimals,
        Some(_) => return None,
    };
    match first {
        b'0' => {
            let mut thousandths: u16 = 0;
            for place in 0..3 {
                let digit = match decimals.get(place) {
                    None => 0,
                    Some(byte) if byte.is_ascii_digit() => u16::from(byte - b'0'),
                    Some(_) => return None,
                };
                thousandths = thousandths * 10 + digit;
            }
            Some(thousandths)
        }
        b'1' if decimals.iter().all(|&byte| byte == b'0') => Some(1000),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::qvalue;

    #[test]
    fn qvalues_are_thousandths() {
        // NG-6.1, NG-6.2
        assert_eq!(qvalue(b"0"), Some(0));
        assert_eq!(qvalue(b"0."), Some(0));
        assert_eq!(qvalue(b"0.5"), Some(500));
        assert_eq!(qvalue(b"0.05"), Some(50));
        assert_eq!(qvalue(b"0.001"), Some(1));
        assert_eq!(qvalue(b"0.999"), Some(999));
        assert_eq!(qvalue(b"1"), Some(1000));
        assert_eq!(qvalue(b"1."), Some(1000));
        assert_eq!(qvalue(b"1.000"), Some(1000));
        for bytes in [&b""[..], b"1.001", b"0.1234", b"2", b".5", b"-0", b"0,5", b"0.x", b"1.0000", b"01"] {
            assert_eq!(qvalue(bytes), None, "{bytes:?}");
        }
    }
}
