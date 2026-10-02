/**
 * Production checklist (Phase 4.3, spec §9).
 *
 * The checklist is a computed template plus a stored set of ticked keys. These
 * tests pin the three rules that keep it from growing into a second workflow:
 * only template keys can be stored, stored keys that are no longer in the
 * template never resurface, and completing everything changes no state at all.
 *
 * Pure: no database, no session.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  checklistKeysFor,
  checklistProgress,
  checklistTemplate,
  isChecklistKey,
  parseChecklistState,
  toggleChecklist,
} from "./checklist";

/* ==========================================================================
 * Template
 * ========================================================================== */

test("every production type gets the shared items in a stable order", () => {
  const template = checklistTemplate("anything_at_all");
  assert.ok(template.length >= 8);
  assert.equal(template[0].key, "brief_reviewed");
  assert.equal(template[template.length - 1].key, "deliverable_ready");
  // No duplicate keys, ever.
  assert.equal(new Set(template.map((item) => item.key)).size, template.length);
});

test("a type adds only its own genuinely useful items", () => {
  const cover = checklistTemplate("cover_artwork").map((item) => item.key);
  const presentation = checklistTemplate("presentation").map((item) => item.key);

  // Cover artwork shares the base set and adds nothing further.
  assert.equal(cover.includes("slide_flow_reviewed"), false);
  // A presentation does add its own item, and each extra has a real label.
  assert.ok(presentation.includes("slide_flow_reviewed"));
  const extra = checklistTemplate("presentation").find(
    (item) => item.key === "slide_flow_reviewed",
  );
  assert.equal(extra?.label, "Slide flow reviewed");
});

test("no checklist item is ever labelled with a raw stored key", () => {
  for (const type of ["document", "presentation", "social_content", "motion", "epk"]) {
    for (const item of checklistTemplate(type)) {
      assert.match(item.label, /^[A-Z]/, `${item.key} has an unusable label`);
      assert.equal(item.label.includes("_"), false, `${item.key} leaked a raw key`);
    }
  }
});

/* ==========================================================================
 * Progress projection
 * ========================================================================== */

test("stored state is projected onto the template and unknown keys are dropped", () => {
  const progress = checklistProgress("cover_artwork", [
    "brief_reviewed",
    "not_a_real_item",
    "export_checked",
  ]);

  assert.equal(progress.checkedCount, 2);
  assert.equal(progress.totalCount, checklistTemplate("cover_artwork").length);
  assert.equal(progress.complete, false);
  assert.deepEqual(
    progress.items.filter((item) => item.checked).map((item) => item.key),
    ["brief_reviewed", "export_checked"],
  );
});

test("a key that is no longer part of the template cannot reappear", () => {
  // A presentation's extra item, stored against a cover-artwork job.
  const progress = checklistProgress("cover_artwork", ["slide_flow_reviewed"]);
  assert.equal(progress.checkedCount, 0);
  assert.equal(progress.items.some((item) => item.key === "slide_flow_reviewed"), false);
});

test("completing everything is complete and still changes no state", () => {
  const keys = checklistKeysFor("cover_artwork");
  const progress = checklistProgress("cover_artwork", keys);
  assert.equal(progress.complete, true);
  assert.equal(progress.checkedCount, progress.totalCount);
  // Nothing in the result is a status, a job state or a release flag.
  assert.deepEqual(Object.keys(progress).sort(), [
    "checkedCount",
    "complete",
    "items",
    "totalCount",
  ]);
});

/* ==========================================================================
 * Toggling
 * ========================================================================== */

test("toggling keeps only real template keys and stores them in template order", () => {
  let state = toggleChecklist("cover_artwork", [], "export_checked", true);
  state = toggleChecklist("cover_artwork", state, "brief_reviewed", true);
  state = toggleChecklist("cover_artwork", state, "not_a_real_item", true);

  assert.deepEqual(state, ["brief_reviewed", "export_checked"]);
});

test("unticking removes the key and toggling twice is idempotent", () => {
  const on = toggleChecklist("cover_artwork", [], "brief_reviewed", true);
  const onAgain = toggleChecklist("cover_artwork", on, "brief_reviewed", true);
  assert.deepEqual(onAgain, on);

  const off = toggleChecklist("cover_artwork", on, "brief_reviewed", false);
  assert.deepEqual(off, []);
});

test("a key belonging to another production type is refused", () => {
  assert.equal(isChecklistKey("cover_artwork", "slide_flow_reviewed"), false);
  assert.equal(isChecklistKey("presentation", "slide_flow_reviewed"), true);
  assert.deepEqual(
    toggleChecklist("cover_artwork", ["brief_reviewed"], "slide_flow_reviewed", true),
    ["brief_reviewed"],
  );
});

/* ==========================================================================
 * Stored state parsing
 * ========================================================================== */

test("stored checklist state tolerates anything unrecognised as empty", () => {
  for (const value of [null, undefined, "brief_reviewed", 17, {}, [1, 2], [{ a: 1 }]]) {
    assert.deepEqual(parseChecklistState(value), []);
  }
});

test("stored checklist state is de-duplicated and trimmed of unusable entries", () => {
  assert.deepEqual(
    parseChecklistState(["brief_reviewed", "brief_reviewed", "", "export_checked"]),
    ["brief_reviewed", "export_checked"],
  );
});
