//! Media ranges and the `Accept` field of HTTP (RFC 9110), and the weight that an `Accept` field gives each candidate
//! media type of a list. The rules are `docs/spec/negotiate.md`, NG-1 to NG-12; the grammar of tokens, quoted strings
//! and parameters and the comparison of values are those of the dependency `polyspec-http-media-type` (NG-3, NG-8.4).
//!
//! Every function is pure (NG-12): it reads its arguments and returns a value or an [`Error`] with a kind (NG-11).
//! The library takes no candidate and orders no equal weights (NG-10.4).

mod accept;
mod candidate;
mod error;

pub use accept::{Accept, Range, FULL_WEIGHT};
pub use candidate::{Candidate, CandidateParameter, Matching, Weight};
pub use error::Error;

/// The fault injection points of the library (binding design G-5, X-1; `docs/spec/negotiate.md`, NG-11.4), which the
/// interface contract names in `faults`. A point does nothing unless the feature `fault-test` is on.
pub mod fault {
    /// The index of the deciding range in `Accept::weigh`, treated as not fitting the integer of the interface: the
    /// kind `internal`, which no input reaches.
    #[doc(hidden)]
    pub const INTERNAL: &str = "http_negotiation.internal";
}
