import test from "node:test";
import assert from "node:assert/strict";

import {
  canReviewTransition,
  isDecidedReview,
  isMeaningfulFeedback,
  isOpenReview,
  reviewDecisions,
  reviewLifecycle,
  reviewOutcomeLabels,
  reviewStatusForDecision,
  reviewTransitions,
} from "./review-state";

test("a pending review has exactly two legal moves", () => {
  assert.deepEqual([...reviewTransitions.pending], ["approved", "changes_requested"]);
  assert.equal(canReviewTransition("pending", "approved"), true);
  assert.equal(canReviewTransition("pending", "changes_requested"), true);

  // Nothing else is reachable: in particular not back to itself, and not
  // straight to superseded (that happens only when newer work overtakes it).
  for (const state of reviewLifecycle) {
    if (state === "approved" || state === "changes_requested") continue;
    assert.equal(
      canReviewTransition("pending", state),
      false,
      `pending must not move to ${state}`,
    );
  }
});

test("a decided review is final", () => {
  for (const state of ["changes_requested", "approved", "superseded"] as const) {
    assert.equal(reviewTransitions[state].length, 0, `${state} must be terminal`);
    for (const target of reviewLifecycle) {
      assert.equal(canReviewTransition(state, target), false);
    }
  }
});

test("same state is never a move", () => {
  for (const state of reviewLifecycle) {
    assert.equal(canReviewTransition(state, state), false);
  }
});

test("the only decisions are approve and request changes", () => {
  assert.deepEqual([...reviewDecisions], ["approve", "request_changes"]);
  assert.equal(reviewStatusForDecision("approve"), "approved");
  assert.equal(reviewStatusForDecision("request_changes"), "changes_requested");
  // An unknown value can never produce a state.
  assert.equal(
    reviewStatusForDecision("maybe" as never),
    null,
  );
  assert.equal(
    reviewStatusForDecision("approved" as never),
    null,
  );
});

test("open and decided are exactly the states they claim to be", () => {
  assert.equal(isOpenReview("pending"), true);
  assert.equal(isOpenReview("approved"), false);
  assert.equal(isOpenReview("changes_requested"), false);
  assert.equal(isOpenReview("superseded"), false);

  assert.equal(isDecidedReview("approved"), true);
  assert.equal(isDecidedReview("changes_requested"), true);
  assert.equal(isDecidedReview("pending"), false);
  assert.equal(isDecidedReview("superseded"), false);

  // Every state is either open or decided or closed — never ambiguous.
  for (const state of reviewLifecycle) {
    const classified =
      isOpenReview(state) || isDecidedReview(state) || state === "superseded";
    assert.equal(classified, true, `${state} must be classified`);
  }
});

test("request changes requires real feedback", () => {
  assert.equal(isMeaningfulFeedback("please warm the background"), true);
  assert.equal(isMeaningfulFeedback("  spaced out  "), true);
  assert.equal(isMeaningfulFeedback(""), false);
  assert.equal(isMeaningfulFeedback("   \n\t "), false);
  assert.equal(isMeaningfulFeedback(null), false);
  assert.equal(isMeaningfulFeedback(undefined), false);
});

test("customer wording never leaks an internal state", () => {
  for (const [state, label] of Object.entries(reviewOutcomeLabels)) {
    assert.equal(typeof label, "string");
    assert.ok(label.length > 0, `${state} needs customer wording`);
    // The internal queue vocabulary must not appear in customer copy.
    for (const forbidden of ["internal_qa", "in_production", "queue", "job"]) {
      assert.equal(
        label.includes(forbidden),
        false,
        `"${forbidden}" must not appear in the customer label for ${state}`,
      );
    }
  }
});
