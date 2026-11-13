// The contract cases of http-negotiation run against the installed Node package (NG-1 to NG-12).
// HTTP_NEGOTIATION_CASES is the path of contracts/negotiate.json; make test-node sets it. A text of the cases is latin1
// (NG-1.4), which the package takes and gives as a string of U+0000 to U+00FF. A case of the group internal arms its
// faults for the member through the addon, as a generated test does (binding G-5, NG-11.4), and a fault that did not
// fire fails it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as negotiation from '@polyspec/http-negotiation';

const require = createRequire(import.meta.url);
const cases = JSON.parse(readFileSync(process.env.HTTP_NEGOTIATION_CASES, 'utf8'));

// The addon of the platform package (binding T-2), which holds the entry points of the feature fault-test.
const addon = () =>
  require(`@polyspec/http-negotiation-${process.platform}-${process.arch}${process.platform === 'linux' ? '-gnu' : ''}`);

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

function weigh(kase) {
  const accept = negotiation.Accept.parse(kase.lines);
  if (kase.faults === undefined) return accept.weigh(kase.candidates);
  const armed = addon().__armFaults('accept.weigh', JSON.stringify(kase.faults));
  try {
    return accept.weigh(kase.candidates);
  } finally {
    assert.deepEqual(addon().__faultLeft(armed), [], kase.id);
  }
}

test('accept', () => {
  assert.ok(cases.accept.length > 0);
  for (const kase of cases.accept) {
    check({ ...kase, expected: kase.ranges }, () => negotiation.Accept.parse(kase.lines), rangesOf);
  }
});

test('weigh', () => {
  assert.ok(cases.weigh.length > 0 && cases.internal.length > 0);
  for (const kase of [...cases.weigh, ...cases.internal]) {
    check({ ...kase, expected: kase.weights }, () => weigh(kase), weightsOf);
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
