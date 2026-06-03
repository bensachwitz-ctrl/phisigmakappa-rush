import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canVoteOnAudience,
  parsePollOptions,
  type PollAudience,
} from "./poll-options.ts";

// ---------------------------------------------------------------------------
// canVoteOnAudience — the R48 poll-vote authorization rule.
// This is the security-critical predicate the /api/polls/[id]/vote route 403s
// on. Brothers may vote on BROTHERS/ALL; alumni on ALUMNI/ALL; nothing else.
// ---------------------------------------------------------------------------

test("brother can vote on BROTHERS and ALL, not ALUMNI", () => {
  assert.equal(canVoteOnAudience({ kind: "brother" }, "BROTHERS"), true);
  assert.equal(canVoteOnAudience({ kind: "brother" }, "ALL"), true);
  assert.equal(canVoteOnAudience({ kind: "brother" }, "ALUMNI"), false);
});

test("alumni can vote on ALUMNI and ALL, not BROTHERS", () => {
  assert.equal(canVoteOnAudience({ kind: "alumni" }, "ALUMNI"), true);
  assert.equal(canVoteOnAudience({ kind: "alumni" }, "ALL"), true);
  assert.equal(canVoteOnAudience({ kind: "alumni" }, "BROTHERS"), false);
});

test("null/undefined/unknown audience defaults to BROTHERS-only", () => {
  // Column default + route fallback is "BROTHERS" — the most restrictive.
  assert.equal(canVoteOnAudience({ kind: "brother" }, null), true);
  assert.equal(canVoteOnAudience({ kind: "brother" }, undefined), true);
  assert.equal(canVoteOnAudience({ kind: "alumni" }, null), false);
  assert.equal(canVoteOnAudience({ kind: "alumni" }, undefined), false);
  // A garbage audience value must not accidentally open the poll to anyone.
  assert.equal(canVoteOnAudience({ kind: "brother" }, "WHATEVER"), false);
  assert.equal(canVoteOnAudience({ kind: "alumni" }, "WHATEVER"), false);
});

test("the full audience matrix matches the route's intent", () => {
  const audiences: PollAudience[] = ["BROTHERS", "ALUMNI", "ALL"];
  const expected: Record<string, Record<PollAudience, boolean>> = {
    brother: { BROTHERS: true, ALUMNI: false, ALL: true },
    alumni: { BROTHERS: false, ALUMNI: true, ALL: true },
  };
  for (const kind of ["brother", "alumni"] as const) {
    for (const aud of audiences) {
      assert.equal(
        canVoteOnAudience({ kind }, aud),
        expected[kind][aud],
        `${kind} vs ${aud}`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// parsePollOptions — defensive JSON parsing of the stored options column.
// ---------------------------------------------------------------------------

test("parsePollOptions returns clean options for valid JSON", () => {
  const raw = JSON.stringify([
    { id: "o_1", label: "Yes" },
    { id: "o_2", label: "No" },
  ]);
  assert.deepEqual(parsePollOptions(raw), [
    { id: "o_1", label: "Yes" },
    { id: "o_2", label: "No" },
  ]);
});

test("parsePollOptions returns [] on malformed/garbage input", () => {
  assert.deepEqual(parsePollOptions("not json"), []);
  assert.deepEqual(parsePollOptions("{}"), []);
  assert.deepEqual(parsePollOptions("null"), []);
  assert.deepEqual(parsePollOptions('"a string"'), []);
});

test("parsePollOptions drops entries missing id or label", () => {
  const raw = JSON.stringify([
    { id: "o_1", label: "Keep" },
    { id: "o_2" }, // no label
    { label: "no id" }, // no id
    { id: 5, label: "wrong id type" }, // id not a string
  ]);
  assert.deepEqual(parsePollOptions(raw), [{ id: "o_1", label: "Keep" }]);
});
