// The contract cases of http-negotiation run against the WASM binding of the installed package, its subpath ./wasm
// (NG-1 to NG-12, binding P-5). HTTP_NEGOTIATION_CASES is the path of contracts/negotiate.json; make test-wasm sets it.
// A text of the cases is latin1 (NG-1.4), which the module takes and gives as a string of U+0000 to U+00FF. A case of
// the group internal arms its faults for the member through the entry points of the feature fault-test, which the
// module that wasm-bindgen writes holds beside the module of the subpath, as a generated test does (binding G-5, GN-5,
// NG-11.4), and a fault that did not fire fails it; a module without those entry points fails the case.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as negotiation from '@polyspec/http-negotiation/wasm';

const cases = JSON.parse(readFileSync(process.env.HTTP_NEGOTIATION_CASES, 'utf8'));

// The module that wasm-bindgen writes, which holds the entry points of the feature fault-test (binding GN-5); the module
// of the subpath ./wasm has loaded it when its import ends.
async function addon() {
  const glue = await import(new URL('./http_negotiation_wasm.js', import.meta.resolve('@polyspec/http-negotiation/wasm')).href);
  assert.equal(typeof glue.__armFaults, 'function', 'the module has no entry point that arms faults (binding G-5)');
  return glue;
}

const rangesOf = (accept) =>
  [...accept.ranges].map((r) => ({
    type: r.type,
    subtype: r.subtype,
    parameters: [...r.parameters].map((p) => ({ name: p.name, value: p.value })),
    weight: r.weight,
  }));

const weightsOf = (weights) => [...weights].map((w) => ({ weight: w.weight, range: w.range }));

function check(kase, call, expected) {
  if (kase.raises !== undefined) {
    const category = kase.raises.category[0].toUpperCase() + kase.raises.category.slice(1);
    assert.throws(call, (error) =>
      error.constructor === negotiation[`HttpNegotiation${category}Error`] &&
      error.kind === kase.raises.kind &&
      error.status === kase.raises.status &&
      (kase.raises.message === null || error.message === kase.raises.message), kase.id);
  } else {
    assert.deepEqual(expected(call()), kase.expected, kase.id);
  }
}

function weigh(kase, glue) {
  const accept = negotiation.Accept.parse(kase.lines);
  if (kase.faults === undefined) return accept.weigh(kase.candidates);
  const armed = glue.__armFaults('accept.weigh', JSON.stringify(kase.faults));
  try {
    return accept.weigh(kase.candidates);
  } finally {
    assert.deepEqual(glue.__faultLeft(armed), [], kase.id);
  }
}

test('accept', () => {
  assert.ok(cases.accept.length > 0);
  for (const kase of cases.accept) {
    check({ ...kase, expected: kase.ranges }, () => negotiation.Accept.parse(kase.lines), rangesOf);
  }
});

test('weigh', async () => {
  const glue = await addon();
  assert.ok(cases.weigh.length > 0 && cases.internal.length > 0);
  for (const kase of [...cases.weigh, ...cases.internal]) {
    check({ ...kase, expected: kase.weights }, () => weigh(kase, glue), weightsOf);
  }
});

// NG-7.5: the invalid candidate alone and after a valid one fail the same way.
test('invalidCandidates', () => {
  assert.ok(cases.invalidCandidates.length > 0);
  for (const kase of cases.invalidCandidates) {
    const accept = negotiation.Accept.parse(kase.lines);
    for (const candidates of [[kase.candidates.at(-1)], kase.candidates]) {
      check({ ...kase, expected: kase.weights }, () => accept.weigh(candidates), weightsOf);
    }
  }
});
