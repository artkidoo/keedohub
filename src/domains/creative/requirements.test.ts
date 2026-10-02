/**
 * Output requirements (Phase 4.3, spec §7, §14).
 *
 * The workspace adapts to a production type by foregrounding the fields that
 * type actually has to settle. These tests pin the two rules that keep that
 * honest: the operator's own instruction always wins over a raw customer
 * requirement, and a field nothing supplies comes back as null rather than as an
 * invented value.
 *
 * Pure: no database, no session.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import type { RequirementFact } from "./brief";
import {
  buildOutputRequirements,
  missingOutputRequirements,
  outputRequirementsComplete,
} from "./requirements";

const facts = (...entries: [string, string][]): RequirementFact[] =>
  entries.map(([label, value]) => ({ label, value }));

/* ==========================================================================
 * The production type decides which fields are foregrounded
 * ========================================================================== */

test("a known type foregrounds its own fields and nothing else", () => {
  const cover = buildOutputRequirements({
    type: "cover_artwork",
    instructions: {},
    requirements: [],
  });
  assert.deepEqual(
    cover.map((entry) => entry.field),
    ["dimensions", "format", "export"],
  );

  const social = buildOutputRequirements({
    type: "social_content",
    instructions: {},
    requirements: [],
  });
  assert.equal(social[0].field, "platforms");
  assert.ok(social.some((entry) => entry.field === "copy"));
});

test("an unknown type falls back to the universal fields rather than failing", () => {
  const requirements = buildOutputRequirements({
    type: "brand_new_kind",
    instructions: {},
    requirements: [],
  });
  assert.deepEqual(
    requirements.map((entry) => entry.field),
    ["dimensions", "format", "export"],
  );
});

/* ==========================================================================
 * Nothing is invented
 * ========================================================================== */

test("a field with no source is returned as null with no source label", () => {
  const requirements = buildOutputRequirements({
    type: "cover_artwork",
    instructions: {},
    requirements: [],
  });

  for (const entry of requirements) {
    assert.equal(entry.value, null, entry.field);
    assert.equal(entry.source, null, entry.field);
    assert.ok(entry.label.length > 0);
  }
  assert.equal(outputRequirementsComplete(requirements), false);
  assert.equal(missingOutputRequirements(requirements).length, requirements.length);
});

/* ==========================================================================
 * Where a value comes from
 * ========================================================================== */

test("the operator's instruction answers its field and is marked as such", () => {
  const requirements = buildOutputRequirements({
    type: "cover_artwork",
    instructions: { dimensions: "3000 x 3000 px", format: "PNG" },
    requirements: [],
  });

  const dimensions = requirements.find((entry) => entry.field === "dimensions");
  assert.equal(dimensions?.value, "3000 x 3000 px");
  assert.equal(dimensions?.source, "brief");
  assert.equal(requirements.find((entry) => entry.field === "format")?.value, "PNG");
});

test("the operator's instruction wins over the customer's raw requirement", () => {
  const requirements = buildOutputRequirements({
    type: "cover_artwork",
    instructions: { dimensions: "3000 x 3000 px" },
    requirements: facts(["Sizes", "1080 x 1080"]),
  });

  const dimensions = requirements.find((entry) => entry.field === "dimensions");
  assert.equal(dimensions?.value, "3000 x 3000 px");
  assert.equal(dimensions?.source, "brief");
});

test("a customer requirement answers the field its key describes", () => {
  const requirements = buildOutputRequirements({
    type: "social_content",
    instructions: {},
    requirements: facts(
      ["Platforms", "Instagram, TikTok"],
      ["Sizes", "1080 x 1920"],
      ["Copy", "Launch announcement"],
    ),
  });

  assert.equal(requirements.find((entry) => entry.field === "platforms")?.value, "Instagram, TikTok");
  assert.equal(requirements.find((entry) => entry.field === "dimensions")?.value, "1080 x 1920");
  assert.equal(requirements.find((entry) => entry.field === "copy")?.value, "Launch announcement");
  // Every settled field credits the customer; the one nothing settled stays null.
  assert.equal(
    requirements.filter((entry) => entry.value !== null).every((entry) => entry.source === "request"),
    true,
  );
  assert.deepEqual(
    missingOutputRequirements(requirements).map((entry) => entry.field),
    ["format"],
  );
});

test("one customer requirement is claimed by at most one field", () => {
  // Both "dimensions" and "format" would match a generic "Size and format" key,
  // but a single stored fact is shown once.
  const requirements = buildOutputRequirements({
    type: "cover_artwork",
    instructions: {},
    requirements: facts(["Size and format", "3000 px square, PNG"]),
  });

  const claimed = requirements.filter((entry) => entry.value !== null);
  assert.equal(claimed.length, 1);
  assert.equal(claimed[0].value, "3000 px square, PNG");
});

test("a partially settled job reports exactly what is still missing", () => {
  const requirements = buildOutputRequirements({
    type: "cover_artwork",
    instructions: { dimensions: "3000 x 3000 px" },
    requirements: facts(["File format", "PNG"]),
  });

  assert.equal(outputRequirementsComplete(requirements), false);
  assert.deepEqual(
    missingOutputRequirements(requirements).map((entry) => entry.field),
    ["export"],
  );
});

test("a fully settled job reports itself complete", () => {
  const requirements = buildOutputRequirements({
    type: "cover_artwork",
    instructions: {
      dimensions: "3000 x 3000 px",
      format: "PNG",
      exportRequirements: "sRGB, 300 dpi",
    },
    requirements: [],
  });

  assert.equal(outputRequirementsComplete(requirements), true);
  assert.deepEqual(missingOutputRequirements(requirements), []);
});
