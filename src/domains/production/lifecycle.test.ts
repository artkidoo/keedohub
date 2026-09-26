import test from "node:test";
import assert from "node:assert/strict";

import {
  canTransition,
  customerProjectStatusForJob,
  hasStarted,
  isTerminalJobStatus,
  jobLifecycle,
  jobTransitions,
} from "./lifecycle";

test("lifecycle moves through canonical order with strict transitions", () => {
  // Test starting state
  assert.equal(canTransition("incoming", "briefing"), true);
  assert.equal(canTransition("incoming", "in_production"), false);
  assert.equal(canTransition("incoming", "delivered"), false);

  // In production can only go to internal QA
  assert.equal(canTransition("in_production", "internal_qa"), true);
  assert.equal(canTransition("in_production", "customer_review"), false);
  assert.equal(canTransition("in_production", "delivered"), false);

  // Internal QA can proceed to review or reject back to production
  assert.equal(canTransition("internal_qa", "customer_review"), true);
  assert.equal(canTransition("internal_qa", "in_production"), true);
  assert.equal(canTransition("internal_qa", "approved"), false);

  // Customer review can approve or request changes
  assert.equal(canTransition("customer_review", "approved"), true);
  assert.equal(canTransition("customer_review", "changes_requested"), true);
  assert.equal(canTransition("customer_review", "delivered"), false);

  // Changes requested loops back to production
  assert.equal(canTransition("changes_requested", "in_production"), true);
  assert.equal(canTransition("changes_requested", "delivered"), false);

  // Approved can only be delivered
  assert.equal(canTransition("approved", "delivered"), true);
  assert.equal(canTransition("approved", "in_production"), false);

  // Delivered is terminal
  assert.equal(isTerminalJobStatus("delivered"), true);
  assert.equal(jobTransitions.delivered.length, 0);
  assert.equal(canTransition("delivered", "incoming"), false);
});

test("same status transition is never allowed", () => {
  for (const status of jobLifecycle) {
    assert.equal(canTransition(status, status), false);
  }
});

test("hasStarted correctly flags real production work", () => {
  assert.equal(hasStarted("incoming"), false);
  assert.equal(hasStarted("briefing"), false);
  assert.equal(hasStarted("in_production"), true);
  assert.equal(hasStarted("internal_qa"), true);
  assert.equal(hasStarted("customer_review"), true);
  assert.equal(hasStarted("changes_requested"), true);
  assert.equal(hasStarted("approved"), true);
  assert.equal(hasStarted("delivered"), true);
});

test("customerProjectStatusForJob never leaks internal QA", () => {
  assert.equal(customerProjectStatusForJob("incoming"), "in_production");
  assert.equal(customerProjectStatusForJob("briefing"), "in_production");
  assert.equal(customerProjectStatusForJob("in_production"), "in_production");
  assert.equal(customerProjectStatusForJob("internal_qa"), "in_production");
  assert.equal(customerProjectStatusForJob("customer_review"), "in_review");
  assert.equal(customerProjectStatusForJob("changes_requested"), "changes_requested");
  assert.equal(customerProjectStatusForJob("approved"), "approved");
  assert.equal(customerProjectStatusForJob("delivered"), "delivered");
});

test("lifecycle index matches queue order", () => {
  assert.equal(jobLifecycle.indexOf("incoming"), 0);
  assert.equal(jobLifecycle.indexOf("briefing"), 1);
  assert.equal(jobLifecycle.indexOf("in_production"), 2);
  assert.equal(jobLifecycle.indexOf("delivered"), 7);
});

