//! The properties of the types and errors that a binding relies on (NG-11, NG-12).

use std::mem::align_of;

use polyspec_http_negotiate::{Accept, Candidate, CandidateParameter, Error, Matching, Range, Weight};

fn send_and_sync<T: Send + Sync>() {}

#[test]
fn types_are_send_and_sync_and_need_at_most_16_bytes_of_alignment() {
    // NG-12.1: a binding moves values between threads and places them in memory of its runtime's allocator, which
    // PHP and Python align to 16 bytes at least.
    send_and_sync::<Accept>();
    send_and_sync::<Range>();
    send_and_sync::<Weight>();
    send_and_sync::<Candidate>();
    send_and_sync::<CandidateParameter>();
    send_and_sync::<Matching>();
    send_and_sync::<Error>();
    assert!(align_of::<Accept>() <= 16);
    assert!(align_of::<Range>() <= 16);
    assert!(align_of::<Weight>() <= 16);
    assert!(align_of::<Candidate>() <= 16);
    assert!(align_of::<Error>() <= 16);
}

#[test]
fn every_kind_has_its_status_and_a_fixed_message() {
    // NG-11, NG-11.3, NG-11.2
    let table = [
        (Error::InvalidAccept, "invalid_accept", Some(400)),
        (Error::InvalidWeight, "invalid_weight", Some(400)),
        (Error::InvalidCandidate, "invalid_candidate", None),
        (Error::Internal, "internal", None),
    ];
    for (error, kind, status) in table {
        assert_eq!(error.kind(), kind);
        assert_eq!(error.status(), status);
        assert!(!error.to_string().is_empty());
    }
    // NG-11.2: the message names no input.
    let secret = "text/x-secret-value;q=2";
    match Accept::parse(&[secret]) {
        Err(error) => {
            assert_eq!(error, Error::InvalidWeight);
            assert!(!error.to_string().contains("secret"));
        }
        Ok(accept) => panic!("{secret} gave {:?}", accept.ranges()),
    }
}

#[test]
fn no_size_is_limited() -> Result<(), Error> {
    // NG-12.2: every byte is read; the host bounds the field.
    let count = 100_000;
    let mut line = String::from(&",".repeat(count));
    for index in 0..count {
        line.push_str(&format!("text/x{index};a=\"{}\";q=0.{}, ", "v".repeat(10), index % 10));
    }
    let accept = Accept::parse(&[line.as_bytes()])?;
    assert_eq!(accept.ranges().len(), count);
    let candidate = Candidate {
        r#type: String::from("text"),
        subtype: format!("x{}", count - 1),
        parameters: vec![CandidateParameter { name: String::from("a"), values: vec![b"v".repeat(10)] }],
        matching: Matching::Subset,
        wildcards: true,
    };
    let weights = accept.weigh(&[candidate])?;
    assert_eq!(
        weights,
        vec![Weight { weight: 900, range: Some(u64::try_from(count - 1).map_err(|_e| Error::Internal)?) }]
    );
    Ok(())
}
