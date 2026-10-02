/**
 * What the operator should do next (Phase 4.3, spec §16, §21).
 *
 * Every queue state must have an answer, the answer must not claim the operator
 * can act when they cannot, and creative production must be described as the
 * expected activity only in the states where it actually is.
 *
 * Pure: no database, no session.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { jobLifecycle } from "@/domains/production/lifecycle";
import { isProducing, nextProductionStep } from "./next-step";

test("every internal job state has an honest next step", () => {
  for (const status of jobLifecycle) {
    const step = nextProductionStep(status);
    assert.ok(step.title.length > 0, `${status} has no title`);
    assert.ok(step.detail.length > 0, `${status} has no detail`);
    assert.equal(typeof step.actionable, "boolean");
    // One sentence, not a paragraph.
    assert.ok(step.detail.length < 220, `${status} detail is too long`);
    // Nothing here may describe a state change as something the operator can
    // simply do instead of going through the lifecycle.
    assert.equal(/\btransition\b/i.test(step.detail), false);
  }
});

test("the operator is not told to act while the customer has the work", () => {
  assert.equal(nextProductionStep("customer_review").actionable, false);
  assert.equal(nextProductionStep("delivered").actionable, false);
  assert.equal(nextProductionStep("in_production").actionable, true);
  assert.equal(nextProductionStep("internal_qa").actionable, true);
});

test("approval is described as leading to delivery, never as delivery", () => {
  const approved = nextProductionStep("approved");
  assert.equal(approved.actionable, true);
  assert.match(approved.detail, /deliver/i);
  assert.match(approved.detail, /approval is not delivery/i);
});

test("changes requested sends the operator back to production without losing the old version", () => {
  const changes = nextProductionStep("changes_requested");
  assert.match(changes.detail, /new version/i);
  assert.equal(isProducing("changes_requested"), true);
});

test("creative production is expected only where it really is", () => {
  assert.equal(isProducing("briefing"), true);
  assert.equal(isProducing("in_production"), true);
  assert.equal(isProducing("incoming"), false);
  assert.equal(isProducing("internal_qa"), false);
  assert.equal(isProducing("customer_review"), false);
  assert.equal(isProducing("approved"), false);
  assert.equal(isProducing("delivered"), false);
});
