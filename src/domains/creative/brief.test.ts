/**
 * The creative brief model (Phase 4.3, spec §7, §8, §23).
 *
 * Two promises are tested here. The operator's half: a blank field is stored as
 * absent, a submitted key that is not a real instruction is refused outright, and
 * a brief can never grow without bounds. The customer's half: only facts that
 * genuinely exist are surfaced, nested or unusable values are skipped rather than
 * rendered, and a stored `javascript:` reference can never become a link.
 *
 * Pure: no database, no session.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  INSTRUCTION_FIELDS,
  INSTRUCTION_KEYS,
  briefInputSchema,
  emptyBrief,
  instructionsInputSchema,
  normaliseReferenceLinks,
  normaliseRequirements,
  readBrief,
  writeBrief,
} from "./brief";

/* ==========================================================================
 * Instruction fields are the single source of truth
 * ========================================================================== */

test("instruction fields are unique, bounded and described", () => {
  assert.equal(new Set(INSTRUCTION_KEYS).size, INSTRUCTION_KEYS.length);
  for (const field of INSTRUCTION_FIELDS) {
    assert.ok(field.label.length > 0, `${field.key} has no label`);
    assert.ok(field.help.length > 0, `${field.key} has no help text`);
    assert.ok(field.maxLength > 0 && field.maxLength <= 2000);
  }
  assert.deepEqual(INSTRUCTION_KEYS, INSTRUCTION_FIELDS.map((field) => field.key));
});

/* ==========================================================================
 * Reading a stored brief
 * ========================================================================== */

test("a brief that was never written reads as an honest empty brief", () => {
  for (const blob of [null, undefined, 42, "text", [], {}]) {
    assert.deepEqual(readBrief(blob), emptyBrief());
  }
});

test("a brief with a malformed instructions value reads as empty rather than partial garbage", () => {
  assert.deepEqual(readBrief({ instructions: "not an object" }), emptyBrief());
  assert.deepEqual(readBrief({ instructions: [] }), emptyBrief());
  // An unknown stored key is simply not part of the brief.
  assert.deepEqual(readBrief({ instructions: { invented: "value" } }), emptyBrief());
});

test("stored instruction values are trimmed and truncated to their bound", () => {
  const dimensions = INSTRUCTION_FIELDS.find((field) => field.key === "dimensions");
  assert.ok(dimensions);

  const brief = readBrief({
    instructions: {
      objective: "   Sell the new record   ",
      dimensions: "x".repeat(dimensions!.maxLength + 50),
      creativeDirection: "   ",
    },
    checklist: ["brief_reviewed"],
  });

  assert.equal(brief.instructions.objective, "Sell the new record");
  assert.equal(brief.instructions.dimensions?.length, dimensions!.maxLength);
  // A blank stored value is absent, so the read view shows an empty state.
  assert.equal("creativeDirection" in brief.instructions, false);
  assert.deepEqual(brief.checklist, ["brief_reviewed"]);
});

test("a malformed checklist cannot poison the instructions", () => {
  const brief = readBrief({
    instructions: { objective: "Keep me" },
    checklist: { nope: true },
  });
  assert.equal(brief.instructions.objective, "Keep me");
  assert.deepEqual(brief.checklist, []);
});

/* ==========================================================================
 * Writing a brief
 * ========================================================================== */

test("an entirely empty brief is stored as nothing at all", () => {
  assert.equal(writeBrief(emptyBrief()), null);
  assert.equal(writeBrief({ instructions: { objective: "   " }, checklist: [] }), null);
});

test("only known instruction keys and only present values are written", () => {
  const written = writeBrief({
    instructions: { objective: "Produce the artwork", dimensions: "3000x3000px" },
    checklist: ["brief_reviewed", "brief_reviewed", "export_checked"],
  }) as { instructions: Record<string, string>; checklist: string[] };

  assert.deepEqual(Object.keys(written.instructions).sort(), ["dimensions", "objective"]);
  assert.deepEqual(written.checklist, ["brief_reviewed", "export_checked"]);
});

/* ==========================================================================
 * Validating a submitted brief (spec §23)
 * ========================================================================== */

test("submitted instructions are accepted field by field and an unknown key is refused", () => {
  const accepted = instructionsInputSchema.safeParse({
    objective: "Produce the artwork",
    dimensions: "",
  });
  assert.equal(accepted.success, true);
  // An empty submission means "clear this field", not "store an empty string".
  assert.equal(accepted.success && accepted.data.dimensions, undefined);

  const refused = instructionsInputSchema.safeParse({
    objective: "Produce the artwork",
    productionStatus: "approved",
  });
  assert.equal(refused.success, false);

  // A field over its bound is refused rather than silently truncated.
  const tooLong = instructionsInputSchema.safeParse({ format: "f".repeat(400) });
  assert.equal(tooLong.success, false);
});

test("the whole submitted brief validates instructions and checklist together", () => {
  const ok = briefInputSchema.safeParse({
    instructions: { objective: "Something" },
    checklist: ["brief_reviewed"],
  });
  assert.equal(ok.success, true);

  const empty = briefInputSchema.safeParse({});
  assert.equal(empty.success, true);
  assert.deepEqual(empty.success ? empty.data.checklist : null, []);

  const badChecklist = briefInputSchema.safeParse({ checklist: [1, 2] });
  assert.equal(badChecklist.success, false);
});

/* ==========================================================================
 * The customer's structured requirements (spec §7)
 * ========================================================================== */

test("only scalar and flat-array requirements become facts", () => {
  const facts = normaliseRequirements({
    sizes: ["1080x1080", "1080x1920"],
    quantity: 3,
    print_ready: true,
    empty: "   ",
    nested: { a: 1 },
    list_with_junk: ["ok", null, { b: 2 }],
  });

  assert.deepEqual(facts, [
    { label: "Sizes", value: "1080x1080, 1080x1920" },
    { label: "Quantity", value: "3" },
    { label: "Print ready", value: "Yes" },
    { label: "List with junk", value: "ok" },
  ]);
});

test("requirements that are not a usable object yield no facts at all", () => {
  for (const value of [null, undefined, "1080x1080", 42, ["a"]]) {
    assert.deepEqual(normaliseRequirements(value), []);
  }
});

test("the number of requirement facts shown is bounded", () => {
  const raw: Record<string, string> = {};
  for (let index = 0; index < 60; index += 1) raw[`field_${index}`] = `v${index}`;
  assert.equal(normaliseRequirements(raw).length, 20);
});

/* ==========================================================================
 * The customer's reference links (spec §13)
 * ========================================================================== */

test("a reference is linked only when it is a real http(s) address", () => {
  const refs = normaliseReferenceLinks([
    "https://example.com/moodboard",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "A printed brochure in the studio",
  ]);

  assert.deepEqual(refs, [
    { text: "https://example.com/moodboard", href: "https://example.com/moodboard" },
    { text: "javascript:alert(1)", href: null },
    { text: "data:text/html,<script>alert(1)</script>", href: null },
    { text: "A printed brochure in the studio", href: null },
  ]);
});

test("a labelled reference object is understood, and one without a url is shown as text", () => {
  const refs = normaliseReferenceLinks([
    { label: "Brand board", url: "https://example.com/board" },
    { title: "Competitor", href: "not-a-url" },
    { label: "A folder on the shared drive" },
    { nonsense: true },
    "   ",
  ]);

  assert.deepEqual(refs, [
    { text: "Brand board", href: "https://example.com/board" },
    { text: "Competitor", href: null },
    { text: "A folder on the shared drive", href: null },
  ]);
});

test("reference links that are not an array yield nothing", () => {
  for (const value of [null, undefined, "https://example.com", { url: "x" }]) {
    assert.deepEqual(normaliseReferenceLinks(value), []);
  }
});
