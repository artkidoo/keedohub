import test from "node:test";
import assert from "node:assert/strict";

import {
  accountTypeOf,
  contextAllowedForAccount,
  defaultContextFor,
  isAccountType,
  workspaceContextsFor,
} from "./account-type";

test("isAccountType narrows exactly the two account types", () => {
  assert.equal(isAccountType("brand"), true);
  assert.equal(isAccountType("artist"), true);
  assert.equal(isAccountType("operator"), false);
  assert.equal(isAccountType("admin"), false);
  assert.equal(isAccountType(""), false);
  assert.equal(isAccountType(null), false);
  assert.equal(isAccountType(undefined), false);
  assert.equal(isAccountType(42), false);
});

test("accountTypeOf reads the workspace row and fails safe on anything else", () => {
  assert.equal(accountTypeOf({ accountType: "brand" }), "brand");
  assert.equal(accountTypeOf({ accountType: "artist" }), "artist");
  // NULL means no type on record: legacy dual-context behaviour.
  assert.equal(accountTypeOf({ accountType: null }), null);
  // A missing or malformed row resolves to null, never to a granted context.
  assert.equal(accountTypeOf(null), null);
  assert.equal(accountTypeOf(undefined), null);
  assert.equal(
    accountTypeOf({ accountType: "something-else" as unknown as null }),
    null,
  );
});

test("defaultContextFor sends typed accounts to their workspace and legacy accounts to the default", () => {
  assert.equal(defaultContextFor("brand"), "brand");
  assert.equal(defaultContextFor("artist"), "artist");
  assert.equal(defaultContextFor(null), "brand");
});

test("workspaceContextsFor exposes exactly one context for typed accounts", () => {
  assert.deepEqual(workspaceContextsFor("brand"), ["brand"]);
  assert.deepEqual(workspaceContextsFor("artist"), ["artist"]);
  assert.deepEqual(workspaceContextsFor(null), ["brand", "artist"]);
});

test("a typed account is denied the other context; a legacy account is denied nothing", () => {
  assert.equal(contextAllowedForAccount("brand", "brand"), true);
  assert.equal(contextAllowedForAccount("brand", "artist"), false);
  assert.equal(contextAllowedForAccount("artist", "artist"), true);
  assert.equal(contextAllowedForAccount("artist", "brand"), false);
  // Accounts that predate the field keep both contexts — never converted.
  assert.equal(contextAllowedForAccount(null, "brand"), true);
  assert.equal(contextAllowedForAccount(null, "artist"), true);
});
