use std::fmt;

/// A failure of this library (NG-11). Each variant has a kind that never changes and, for a failure of a request
/// field, an HTTP status.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Error {
    /// A field line of `Accept` does not follow the grammar (NG-5.7).
    InvalidAccept,
    /// A weight of `Accept` is not a qvalue (NG-5.7, NG-6.1).
    InvalidWeight,
    /// A candidate breaks NG-7.
    InvalidCandidate,
    /// An index does not fit the integer of the interface (NG-11); memory cannot hold so many ranges.
    Internal,
}

impl Error {
    /// The kind of the failure (NG-11).
    pub fn kind(&self) -> &'static str {
        match self {
            Error::InvalidAccept => "invalid_accept",
            Error::InvalidWeight => "invalid_weight",
            Error::InvalidCandidate => "invalid_candidate",
            Error::Internal => "internal",
        }
    }

    /// The HTTP status of the failure: 400 for a failure of the request field `Accept` (NG-11.3), none otherwise.
    pub fn status(&self) -> Option<u16> {
        match self {
            Error::InvalidAccept | Error::InvalidWeight => Some(400),
            Error::InvalidCandidate | Error::Internal => None,
        }
    }
}

impl fmt::Display for Error {
    /// The fixed sentence of the kind, which names no input (NG-11.2).
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Error::InvalidAccept => "the Accept field does not follow the grammar of RFC 9110, section 12.5.1",
            Error::InvalidWeight => "a weight of the Accept field is not a qvalue of RFC 9110, section 12.4.2",
            Error::InvalidCandidate => "a candidate is not a valid media type with served parameter values",
            Error::Internal => "an index does not fit a 64-bit unsigned integer",
        })
    }
}

impl std::error::Error for Error {}
