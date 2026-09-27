import test from "node:test";
import assert from "node:assert/strict";

import { jobLifecycle } from "./lifecycle";
import { deliverableStatusForJob, deliverableStatusLabels } from "./status";

test("a deliverable's status is derived from its job", () => {
  // Every job state maps to a real deliverable status — the mapping is total,
  // so a new job state cannot silently leave a deliverable behind.
  for (const status of jobLifecycle) {
    const mapped = deliverableStatusForJob(status);
    assert.ok(
      Object.prototype.hasOwnProperty.call(deliverableStatusLabels, mapped),
      `${status} must map to a known deliverable status`,
    );
  }

  assert.equal(deliverableStatusForJob("incoming"), "in_production");
  assert.equal(deliverableStatusForJob("briefing"), "in_production");
  assert.equal(deliverableStatusForJob("in_production"), "in_production");
  assert.equal(deliverableStatusForJob("internal_qa"), "internal_qa");
  assert.equal(deliverableStatusForJob("customer_review"), "customer_review");
  assert.equal(deliverableStatusForJob("changes_requested"), "changes_requested");
  assert.equal(deliverableStatusForJob("approved"), "approved");
  assert.equal(deliverableStatusForJob("delivered"), "delivered");
});

test("internal QA is invisible in customer wording", () => {
  // A customer never sees that work is being checked internally.
  assert.equal(deliverableStatusLabels.internal_qa, deliverableStatusLabels.in_production);
  assert.equal(
    deliverableStatusLabels.in_production,
    deliverableStatusLabels.in_production,
  );
});

test("customer labels never name an internal queue state", () => {
  for (const [status, label] of Object.entries(deliverableStatusLabels)) {
    for (const forbidden of [
      "internal_qa",
      "incoming",
      "briefing",
      "queue",
      "operator",
      "studio",
    ]) {
      assert.equal(
        label.toLowerCase().includes(forbidden),
        false,
        `"${forbidden}" must not appear in the customer label for ${status}`,
      );
    }
  }
});
