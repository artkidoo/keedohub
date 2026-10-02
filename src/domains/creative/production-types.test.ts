/**
 * Production-type taxonomy (Phase 4.3, spec §6, §14).
 *
 * The taxonomy is not a new system: it reuses the customer's own request
 * categories and the single label helper those categories already have. These
 * tests pin the two properties the workspace depends on — a known type gets a
 * tailored profile, an unknown type is never an error and never hides — and they
 * cross-check the profile table against the real category list, so a profile can
 * never claim a type the customer surface does not offer.
 *
 * Pure: no database, no session.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { isRequestCategory, requestCategoryLabel } from "@/domains/requests/categories";
import { productionProfileFor, productionTypeLabel } from "./production-types";

/* ==========================================================================
 * Profiles
 * ========================================================================== */

test("a known production type gets its own profile", () => {
  const cover = productionProfileFor("cover_artwork");
  assert.equal(cover.type, "cover_artwork");
  assert.deepEqual(cover.contexts, ["artist"]);
  assert.ok(cover.emphasises.includes("dimensions"));
  assert.ok(cover.emphasises.includes("export"));
  assert.equal(cover.suggestedDeliverableType, "cover_artwork");

  const social = productionProfileFor("social_content");
  assert.deepEqual(social.contexts, ["brand", "artist"]);
  // Social content leads with where it has to work, not with a page format.
  assert.equal(social.emphasises[0], "platforms");
  assert.ok(!social.emphasises.includes("pageFormat"));
});

test("an unknown production type resolves to the neutral profile, never an error", () => {
  const profile = productionProfileFor("some_future_format");
  assert.equal(profile.type, "some_future_format");
  assert.deepEqual(profile.emphasises, ["dimensions", "format", "export"]);
  assert.deepEqual(profile.contexts, ["brand", "artist"]);
  assert.equal(profile.extraChecklist.length, 0);
});

test("a blank production type is not mistaken for a real one", () => {
  assert.equal(productionProfileFor("   ").type, "other");
});

test("a profile never claims a context the customer interface does not offer that type in", () => {
  // Every type the profiles know about must be a real category of at least one
  // context, and the profiles must not invent a context for it either.
  const types = [
    "document",
    "presentation",
    "marketing_assets",
    "social_content",
    "brand_asset",
    "cover_artwork",
    "release_assets",
    "motion",
    "lyric_content",
    "epk",
    "press_materials",
    "promotional_creative",
  ] as const;

  for (const type of types) {
    const profile = productionProfileFor(type);
    assert.ok(profile.contexts.length > 0, `${type} declares no context`);
    for (const context of profile.contexts) {
      assert.equal(
        isRequestCategory(context, type),
        true,
        `${type} is not a ${context} request category`,
      );
    }
    for (const context of ["brand", "artist"] as const) {
      if (!profile.contexts.includes(context)) {
        assert.equal(
          isRequestCategory(context, type),
          false,
          `${type} is a ${context} category but the profile omits ${context}`,
        );
      }
    }
  }
});

/* ==========================================================================
 * Labels reuse the one label source (spec §6, §24)
 * ========================================================================== */

test("a production type is labelled by the same helper the customer surface uses", () => {
  assert.equal(productionTypeLabel("brand", "document"), requestCategoryLabel("brand", "document"));
  assert.equal(productionTypeLabel("brand", "document"), "Document");
  assert.equal(productionTypeLabel("artist", "cover_artwork"), "Cover artwork");
  assert.equal(productionTypeLabel("artist", "press_materials"), "Press materials");
});

test("a type outside the customer vocabulary is humanised rather than hidden", () => {
  assert.equal(productionTypeLabel("brand", "some_future_format"), "Some future format");
  assert.equal(productionTypeLabel("artist", "   "), "Other");
});
