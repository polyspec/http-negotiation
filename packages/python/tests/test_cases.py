"""The contract cases of http-negotiation run against the installed Python package (NG-1 to NG-12).

HTTP_NEGOTIATION_CASES is the path of contracts/negotiate.json; make test-python sets it. A text of the cases is latin1
(NG-1.4), which the package takes and gives as a str of U+0000 to U+00FF. A case of the group internal arms its faults
for the member, as a generated test does (binding G-5, NG-11.4), and a fault that did not fire fails it.
"""

import json
import os
import unittest

import polyspec.http_negotiation as negotiation
from polyspec.http_negotiation import _native

CASES = os.environ["HTTP_NEGOTIATION_CASES"]


def load() -> dict:
    with open(CASES, encoding="utf-8") as file:
        return json.load(file)


def ranges_of(accept: negotiation.Accept) -> list:
    return [
        {
            "type": r.type,
            "subtype": r.subtype,
            "parameters": [{"name": p.name, "value": p.value} for p in r.parameters],
            "weight": r.weight,
        }
        for r in accept.ranges
    ]


def weights_of(weights: list) -> list:
    return [{"weight": w.weight, "range": w.range} for w in weights]


def candidate(value: dict) -> negotiation.Candidate:
    return negotiation.Candidate(
        type=value["type"],
        subtype=value["subtype"],
        parameters=[negotiation.CandidateParameter(name=p["name"], values=p["values"]) for p in value["parameters"]],
        matching=negotiation.Matching(value["matching"]),
        wildcards=value["wildcards"],
    )


class ContractCaseTest(unittest.TestCase):
    def check_raises(self, case: dict, call) -> None:
        raises = case["raises"]
        with self.assertRaises(Exception) as caught:
            call()
        error = caught.exception
        self.assertEqual(error.kind, raises["kind"])
        self.assertEqual(error.status, raises["status"])
        category = raises["category"].capitalize()
        self.assertIs(type(error), getattr(negotiation, f"HTTPNegotiation{category}Error"))
        if raises["message"] is not None:
            self.assertEqual(str(error), raises["message"])

    def check(self, case: dict, key: str, call, plain) -> None:
        if "raises" in case:
            self.check_raises(case, call)
        else:
            self.assertEqual(plain(call()), case[key])

    def weigh(self, case: dict) -> list:
        accept = negotiation.Accept.parse(case["lines"])
        candidates = [candidate(c) for c in case["candidates"]]
        if "faults" not in case:
            return accept.weigh(candidates)
        armed = _native._arm_faults("accept.weigh", json.dumps(case["faults"]))
        try:
            return accept.weigh(candidates)
        finally:
            self.assertEqual(_native._fault_left(armed), [])

    def test_accept(self) -> None:
        group = load()["accept"]
        self.assertGreater(len(group), 0)
        for case in group:
            with self.subTest(case=case["id"]):
                self.check(case, "ranges", lambda: negotiation.Accept.parse(case["lines"]), ranges_of)

    def test_weigh(self) -> None:
        cases = load()
        group = cases["weigh"] + cases["internal"]
        self.assertGreater(len(cases["weigh"]), 0)
        self.assertGreater(len(cases["internal"]), 0)
        for case in group:
            with self.subTest(case=case["id"]):
                self.check(case, "weights", lambda: self.weigh(case), weights_of)

    def test_invalid_candidates(self) -> None:
        # NG-7.5: the invalid candidate alone and after a valid one fail the same way.
        group = load()["invalidCandidates"]
        self.assertGreater(len(group), 0)
        for case in group:
            with self.subTest(case=case["id"]):
                accept = negotiation.Accept.parse(case["lines"])
                candidates = [candidate(c) for c in case["candidates"]]
                for given in ([candidates[-1]], candidates):
                    self.check(case, "weights", lambda: accept.weigh(given), weights_of)


if __name__ == "__main__":
    unittest.main()
