//! The grammar that media types and `Accept` share: tokens, whitespace, quoted strings and parameters (NG-1 to NG-3).

use crate::Parameter;

/// A `tchar` (NG-2.1, RFC 9110, section 5.6.2).
pub(crate) fn is_tchar(byte: u8) -> bool {
    byte.is_ascii_alphanumeric()
        || matches!(
            byte,
            b'!' | b'#' | b'$' | b'%' | b'&' | b'\'' | b'*' | b'+' | b'-' | b'.' | b'^' | b'_' | b'`' | b'|' | b'~'
        )
}

/// SP or HTAB, the bytes of `OWS` (RFC 9110, section 5.6.3).
pub(crate) fn is_ows(byte: u8) -> bool {
    byte == b' ' || byte == b'\t'
}

/// A `qdtext` byte (NG-3.3).
fn is_qdtext(byte: u8) -> bool {
    byte == b'\t'
        || byte == b' '
        || byte == 0x21
        || (0x23..=0x5B).contains(&byte)
        || (0x5D..=0x7E).contains(&byte)
        || byte >= 0x80
}

/// A byte that a quoted string can carry, alone or after a backslash: HTAB, SP, VCHAR and `obs-text` (NG-3.3, NG-7.3).
pub(crate) fn is_quotable(byte: u8) -> bool {
    byte == b'\t' || byte == b' ' || (0x21..=0x7E).contains(&byte) || byte >= 0x80
}

/// A token: one or more `tchar` (NG-2.1).
pub(crate) fn is_token(bytes: &[u8]) -> bool {
    !bytes.is_empty() && bytes.iter().all(|&byte| is_tchar(byte))
}

/// The value without the SP and HTAB around it (NG-1.3).
pub(crate) fn trim_ows(bytes: &[u8]) -> &[u8] {
    let mut inner = bytes;
    while let [first, rest @ ..] = inner {
        if !is_ows(*first) {
            break;
        }
        inner = rest;
    }
    while let [rest @ .., last] = inner {
        if !is_ows(*last) {
            break;
        }
        inner = rest;
    }
    inner
}

/// A token as lowercase text (NG-1.2, NG-2.2). The caller has checked that the bytes are a token, so they are ASCII.
pub(crate) fn lowercase(token: &[u8]) -> String {
    token.iter().map(|&byte| char::from(byte.to_ascii_lowercase())).collect()
}

/// A failure of the shared grammar, which each reader turns into the kind of its own field.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Fault {
    /// The bytes do not follow the grammar.
    Grammar,
    /// The value of the weight `q` is not a qvalue (NG-6.1).
    Weight,
}

/// What the parameters of a media type or a media range end with.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Q {
    /// No parameter named `q`.
    None,
    /// The weight in thousandths (NG-6.2).
    Thousandths(u16),
}

/// A reading position over the bytes of one value: the bytes not read yet.
pub(crate) struct Cursor<'a> {
    rest: &'a [u8],
}

impl<'a> Cursor<'a> {
    pub(crate) fn new(bytes: &'a [u8]) -> Self {
        Cursor { rest: bytes }
    }

    pub(crate) fn peek(&self) -> Option<u8> {
        self.rest.first().copied()
    }

    pub(crate) fn at_end(&self) -> bool {
        self.rest.is_empty()
    }

    /// Consumes the next byte when `accept` takes it.
    fn advance_if(&mut self, accept: impl Fn(u8) -> bool) -> Option<u8> {
        match self.rest {
            [first, rest @ ..] if accept(*first) => {
                self.rest = rest;
                Some(*first)
            }
            _ => None,
        }
    }

    pub(crate) fn skip_ows(&mut self) {
        while self.advance_if(is_ows).is_some() {}
    }

    /// Consumes `byte` when it is next.
    pub(crate) fn eat(&mut self, byte: u8) -> bool {
        self.advance_if(|next| next == byte).is_some()
    }

    /// Consumes the longest run of bytes that `accept` takes.
    fn run(&mut self, accept: impl Fn(u8) -> bool) -> &'a [u8] {
        let length = self.rest.iter().take_while(|&&byte| accept(byte)).count();
        let (run, rest) = self.rest.split_at(length);
        self.rest = rest;
        run
    }

    /// Consumes the longest run of `tchar`; fails when it is empty (NG-2.1).
    pub(crate) fn token(&mut self) -> Result<&'a [u8], Fault> {
        match self.run(is_tchar) {
            [] => Err(Fault::Grammar),
            token => Ok(token),
        }
    }

    /// Consumes the bytes up to the next SP, HTAB, `;`, `,` or the end (NG-6.1).
    fn word(&mut self) -> &'a [u8] {
        self.run(|byte| !is_ows(byte) && byte != b';' && byte != b',')
    }

    /// Consumes a quoted string at a `"` and returns its value (NG-3.3, NG-3.4).
    fn quoted_string(&mut self) -> Result<Vec<u8>, Fault> {
        if !self.eat(b'"') {
            return Err(Fault::Grammar);
        }
        let mut value = Vec::new();
        loop {
            if self.eat(b'"') {
                return Ok(value);
            }
            let byte = if self.eat(b'\\') { self.advance_if(is_quotable) } else { self.advance_if(is_qdtext) };
            match byte {
                Some(byte) => value.push(byte),
                // NG-3.3: a byte that is no qdtext, or the end before the closing quote, fails.
                None => return Err(Fault::Grammar),
            }
        }
    }

    /// Reads `parameters` (NG-3) and, when `weighted`, the weight that ends them (NG-5.5).
    ///
    /// The cursor stops after the last parameter or weight, before the whitespace that follows it. Without
    /// `weighted`, a parameter named `q` is a grammar failure (NG-4.3).
    pub(crate) fn parameters(&mut self, weighted: bool) -> Result<(Vec<Parameter>, Q), Fault> {
        let mut parameters: Vec<Parameter> = Vec::new();
        loop {
            let before = self.rest;
            self.skip_ows();
            if !self.eat(b';') {
                self.rest = before;
                return Ok((parameters, Q::None));
            }
            self.skip_ows();
            match self.peek() {
                // NG-3.2: an empty parameter gives nothing.
                None | Some(b';') | Some(b',') => continue,
                Some(_) => {}
            }
            let name = lowercase(self.token()?);
            if !self.eat(b'=') {
                return Err(Fault::Grammar);
            }
            if name == "q" {
                if !weighted {
                    return Err(Fault::Grammar);
                }
                // NG-5.5: the weight ends the range; the caller reads what follows it.
                let weight = qvalue(self.word()).ok_or(Fault::Weight)?;
                return Ok((parameters, Q::Thousandths(weight)));
            }
            let value = if self.peek() == Some(b'"') { self.quoted_string()? } else { self.token()?.to_vec() };
            // NG-3.5: a parameter given twice fails.
            if parameters.iter().any(|parameter| parameter.name == name) {
                return Err(Fault::Grammar);
            }
            parameters.push(Parameter { name, value });
        }
    }
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
