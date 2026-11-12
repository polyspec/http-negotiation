//! Media types (NG-4).

use crate::syntax::{lowercase, trim_ows, Cursor, Fault, Q};
use crate::Error;

/// A parameter of a media type or a media range: its name in lowercase and its value without quoting (NG-3.4).
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Parameter {
    pub name: String,
    pub value: Vec<u8>,
}

/// A media type: its type and subtype in lowercase and its parameters in order (NG-4.4).
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct MediaType {
    pub r#type: String,
    pub subtype: String,
    pub parameters: Vec<Parameter>,
}

/// Reads a media type value (NG-4).
pub fn parse_media_type(value: &[u8]) -> Result<MediaType, Error> {
    read(trim_ows(value)).map_err(|fault| match fault {
        // NG-4.3: a weight is a parameter named q, which a media type cannot have.
        Fault::Grammar | Fault::Weight => Error::InvalidMediaType,
    })
}

fn read(value: &[u8]) -> Result<MediaType, Fault> {
    let mut cursor = Cursor::new(value);
    let r#type = cursor.token()?;
    if !cursor.eat(b'/') {
        return Err(Fault::Grammar);
    }
    let subtype = cursor.token()?;
    // NG-4.2: `*` is the wildcard of a range, not a type.
    if r#type == b"*" || subtype == b"*" {
        return Err(Fault::Grammar);
    }
    let (parameters, weight) = cursor.parameters(false)?;
    if weight != Q::None || !cursor.at_end() {
        return Err(Fault::Grammar);
    }
    Ok(MediaType { r#type: lowercase(r#type), subtype: lowercase(subtype), parameters })
}
