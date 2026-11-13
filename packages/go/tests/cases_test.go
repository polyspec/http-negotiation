// The contract cases of http-negotiation run against the Go package (NG-1 to NG-12). HTTP_NEGOTIATION_CASES is the
// path of contracts/negotiate.json; make test-go sets it. A latin1 text of the cases is a Go string of its runes U+0000
// to U+00FF (NG-1.4, binding B-8); a name, a type and a subtype are a text, a Go string of UTF-8 bytes. A case of the
// group internal arms its faults for the member, as a generated test does (binding G-5, NG-11.4); the Go binding has
// no entry point that arms faults, so such a case fails.
package tests

import (
	"encoding/json"
	"errors"
	"os"
	"reflect"
	"testing"

	"github.com/polyspec/http-negotiation/packages/go/accept"
	liberrors "github.com/polyspec/http-negotiation/packages/go/errors"
)

type raises struct {
	Kind     string  `json:"kind"`
	Status   *int    `json:"status"`
	Category string  `json:"category"`
	Message  *string `json:"message"`
}

type parameter struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type rangeValue struct {
	Type       string      `json:"type"`
	Subtype    string      `json:"subtype"`
	Parameters []parameter `json:"parameters"`
	Weight     uint64      `json:"weight"`
}

type candidateParameter struct {
	Name   string   `json:"name"`
	Values []string `json:"values"`
}

type candidate struct {
	Type       string               `json:"type"`
	Subtype    string               `json:"subtype"`
	Parameters []candidateParameter `json:"parameters"`
	Matching   string               `json:"matching"`
	Wildcards  bool                 `json:"wildcards"`
}

type weight struct {
	Weight uint64  `json:"weight"`
	Range  *uint64 `json:"range"`
}

type weighCase struct {
	ID         string            `json:"id"`
	Lines      []string          `json:"lines"`
	Candidates []candidate       `json:"candidates"`
	Faults     []json.RawMessage `json:"faults"`
	Weights    []weight          `json:"weights"`
	Raises     *raises           `json:"raises"`
}

type cases struct {
	Accept []struct {
		ID     string       `json:"id"`
		Lines  []string     `json:"lines"`
		Ranges []rangeValue `json:"ranges"`
		Raises *raises      `json:"raises"`
	} `json:"accept"`
	Weigh             []weighCase `json:"weigh"`
	InvalidCandidates []weighCase `json:"invalidCandidates"`
	Internal          []weighCase `json:"internal"`
}

func load(t *testing.T) cases {
	t.Helper()
	text, err := os.ReadFile(os.Getenv("HTTP_NEGOTIATION_CASES"))
	if err != nil {
		t.Fatal(err)
	}
	var all cases
	if err := json.Unmarshal(text, &all); err != nil {
		t.Fatal(err)
	}
	return all
}

// The error type of each category (E-7), with its kind and status.
type failure interface {
	error
	Kind() string
	Status() (int, bool)
}

func category(err error) string {
	var value *liberrors.HTTPNegotiationValueError
	var typ *liberrors.HTTPNegotiationTypeError
	var io *liberrors.HTTPNegotiationIoError
	var store *liberrors.HTTPNegotiationStoreError
	var busy *liberrors.HTTPNegotiationBusyError
	var internal *liberrors.HTTPNegotiationInternalError
	switch {
	case errors.As(err, &value):
		return "value"
	case errors.As(err, &typ):
		return "type"
	case errors.As(err, &io):
		return "io"
	case errors.As(err, &store):
		return "store"
	case errors.As(err, &busy):
		return "busy"
	case errors.As(err, &internal):
		return "internal"
	}
	return ""
}

// check compares an error with the raises of a case: its category, kind, status and, when the case names one, its
// message.
func check(t *testing.T, id string, err error, want *raises) {
	t.Helper()
	var f failure
	if !errors.As(err, &f) || category(err) != want.Category || f.Kind() != want.Kind {
		t.Errorf("%s: got %v, want %s of kind %s", id, err, want.Category, want.Kind)
		return
	}
	status, ok := f.Status()
	if (want.Status == nil) == ok || (ok && status != *want.Status) {
		t.Errorf("%s: status %d %v", id, status, ok)
	}
	if want.Message != nil && f.Error() != *want.Message {
		t.Errorf("%s: message %q", id, f.Error())
	}
}

func ranges(a *accept.Accept) []rangeValue {
	got := a.Ranges()
	out := make([]rangeValue, len(got))
	for i, r := range got {
		parameters := make([]parameter, len(r.Parameters))
		for j, p := range r.Parameters {
			parameters[j] = parameter{Name: p.Name, Value: p.Value}
		}
		out[i] = rangeValue{Type: r.Type, Subtype: r.Subtype, Parameters: parameters, Weight: r.Weight}
	}
	return out
}

func weights(got []accept.Weight) []weight {
	out := make([]weight, len(got))
	for i, w := range got {
		out[i] = weight{Weight: w.Weight, Range: w.Range}
	}
	return out
}

func candidates(values []candidate) []accept.Candidate {
	out := make([]accept.Candidate, len(values))
	for i, c := range values {
		parameters := make([]accept.CandidateParameter, len(c.Parameters))
		for j, p := range c.Parameters {
			parameters[j] = accept.CandidateParameter{Name: p.Name, Values: p.Values}
		}
		out[i] = accept.Candidate{Type: c.Type, Subtype: c.Subtype, Parameters: parameters, Matching: accept.Matching(c.Matching), Wildcards: c.Wildcards}
	}
	return out
}

// compare compares the outcome of a weigh with the weights or the raises of a case.
func compare(t *testing.T, c weighCase, got []accept.Weight, err error) {
	t.Helper()
	if c.Raises != nil {
		check(t, c.ID, err, c.Raises)
		return
	}
	if err != nil || c.Weights == nil {
		t.Errorf("%s: got %v", c.ID, err)
		return
	}
	if !reflect.DeepEqual(weights(got), c.Weights) {
		t.Errorf("%s: got %v, want %v", c.ID, weights(got), c.Weights)
	}
}

func TestAccept(t *testing.T) {
	group := load(t).Accept
	if len(group) == 0 {
		t.Fatal("no cases")
	}
	for _, c := range group {
		got, err := accept.Parse(c.Lines)
		if c.Raises != nil {
			check(t, c.ID, err, c.Raises)
			continue
		}
		if err != nil || c.Ranges == nil {
			t.Errorf("%s: got %v", c.ID, err)
			continue
		}
		if !reflect.DeepEqual(ranges(got), c.Ranges) {
			t.Errorf("%s: got %q, want %q", c.ID, ranges(got), c.Ranges)
		}
	}
}

func TestWeigh(t *testing.T) {
	all := load(t)
	if len(all.Weigh) == 0 || len(all.Internal) == 0 {
		t.Fatal("no cases")
	}
	for _, c := range append(all.Weigh, all.Internal...) {
		if c.Faults != nil {
			t.Errorf("%s: the Go binding has no entry point that arms faults (binding G-5)", c.ID)
			continue
		}
		a, err := accept.Parse(c.Lines)
		if err != nil {
			compare(t, c, nil, err)
			continue
		}
		got, err := a.Weigh(candidates(c.Candidates))
		compare(t, c, got, err)
	}
}

// NG-7.5: the invalid candidate alone and after a valid one fail the same way.
func TestInvalidCandidates(t *testing.T) {
	group := load(t).InvalidCandidates
	if len(group) == 0 {
		t.Fatal("no cases")
	}
	for _, c := range group {
		a, err := accept.Parse(c.Lines)
		if err != nil {
			t.Errorf("%s: got %v", c.ID, err)
			continue
		}
		all := candidates(c.Candidates)
		for _, given := range [][]accept.Candidate{all[len(all)-1:], all} {
			got, err := a.Weigh(given)
			compare(t, c, got, err)
		}
	}
}
