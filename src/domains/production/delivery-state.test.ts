import test from "node:test";
import assert from "node:assert/strict";

import {
  deliveryCustomerCopy,
  deliveryReadiness,
  deliveryRefusalLabels,
  type DeliveryFacts,
} from "./delivery-state";

/** The one combination that may be delivered: approved, current, shared file. */
function approvedFacts(overrides: Partial<DeliveryFacts> = {}): DeliveryFacts {
  return {
    jobStatus: "approved",
    deliverableStatus: "approved",
    reviewStatus: "approved",
    currentVersion: 2,
    reviewedVersion: 2,
    hasFile: true,
    fileIsCustomerVisible: true,
    alreadyDelivered: false,
    ...overrides,
  };
}

test("approved work with a customer-visible current version is deliverable", () => {
  assert.deepEqual(deliveryReadiness(approvedFacts()), { ready: true });
});

test("nothing may be delivered before the customer approves", () => {
  for (const jobStatus of [
    "incoming",
    "briefing",
    "in_production",
    "internal_qa",
    "customer_review",
    "changes_requested",
  ] as const) {
    const readiness = deliveryReadiness(
      approvedFacts({ jobStatus, deliverableStatus: "customer_review" }),
    );
    assert.deepEqual(readiness, { ready: false, reason: "not_approved" });
  }
});

test("a pending review can never authorise a delivery", () => {
  assert.deepEqual(
    deliveryReadiness(
      approvedFacts({ jobStatus: "customer_review", reviewStatus: "pending" }),
    ),
    { ready: false, reason: "not_approved" },
  );
  // Even with the job forced to approved, an open review is not an approval.
  assert.deepEqual(
    deliveryReadiness(approvedFacts({ reviewStatus: "pending" })),
    { ready: false, reason: "review_not_approved" },
  );
});

test("a change request can never authorise a delivery", () => {
  assert.deepEqual(
    deliveryReadiness(approvedFacts({ reviewStatus: "changes_requested" })),
    { ready: false, reason: "review_not_approved" },
  );
});

test("a superseded review can never authorise a delivery", () => {
  assert.deepEqual(
    deliveryReadiness(approvedFacts({ reviewStatus: "superseded" })),
    { ready: false, reason: "review_not_approved" },
  );
});

test("an approval of a superseded version is refused", () => {
  // The review says version 1 was approved, but version 2 is now current.
  assert.deepEqual(
    deliveryReadiness(approvedFacts({ currentVersion: 2, reviewedVersion: 1 })),
    { ready: false, reason: "version_mismatch" },
  );
});

test("no review at all is refused", () => {
  assert.deepEqual(
    deliveryReadiness(approvedFacts({ reviewStatus: null, reviewedVersion: null })),
    { ready: false, reason: "no_review" },
  );
});

test("a version with no file, or no shareable file, is refused", () => {
  assert.deepEqual(deliveryReadiness(approvedFacts({ hasFile: false })), {
    ready: false,
    reason: "no_file",
  });
  assert.deepEqual(deliveryReadiness(approvedFacts({ fileIsCustomerVisible: false })), {
    ready: false,
    reason: "not_shared",
  });
});

test("a job and deliverable that disagree are refused", () => {
  assert.deepEqual(
    deliveryReadiness(approvedFacts({ deliverableStatus: "in_production" })),
    { ready: false, reason: "inconsistent_state" },
  );
});

test("delivery is idempotent: a repeat is reported, not refused", () => {
  // The caller treats this as "already done" and returns the existing record.
  assert.deepEqual(deliveryReadiness(approvedFacts({ alreadyDelivered: true })), {
    ready: false,
    reason: "already_delivered",
  });
});

test("idempotency is reported before any other reason", () => {
  // Even work that is not approved reports "already delivered" first: a second
  // submit must never be treated as a fresh attempt.
  assert.deepEqual(
    deliveryReadiness(
      approvedFacts({ alreadyDelivered: true, jobStatus: "in_production" }),
    ),
    { ready: false, reason: "already_delivered" },
  );
});

test("every refusal has honest internal wording", () => {
  for (const reason of Object.keys(deliveryRefusalLabels)) {
    const label = deliveryRefusalLabels[reason as keyof typeof deliveryRefusalLabels];
    assert.equal(typeof label, "string");
    assert.ok(label.length > 0, `${reason} needs wording`);
  }
});

test("customer delivery copy names no internal state", () => {
  for (const value of Object.values(deliveryCustomerCopy)) {
    for (const forbidden of [
      "Studio",
      "operator",
      "queue",
      "internal",
      "QA",
      "version",
      "deliverable",
      "job",
    ]) {
      assert.equal(
        value.includes(forbidden),
        false,
        `"${forbidden}" must not appear in customer delivery copy`,
      );
    }
  }
});
