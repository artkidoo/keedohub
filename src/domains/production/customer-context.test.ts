/**
 * Pure customer-context normalisers (Phase 4.2, spec §8) — no database.
 *
 * The whole point of §8 is honesty about what the customer actually supplied:
 * show present fields only, paint only real colours, and say "nothing recorded"
 * rather than pad the screen. Those are pure rules, so they are tested here as
 * pure functions on hand-built profile rows — no PostgreSQL, no fixtures.
 */

// The module graph reaches the auth server via access; make sure the local
// env is present before any import runs (no query is ever issued here).
try {
  process.loadEnvFile();
} catch {
  // No .env in some environments; not needed for these pure checks.
}

import test from "node:test";
import assert from "node:assert/strict";

import {
  colourSwatches,
  isPaintableColour,
  normaliseArtistContext,
  normaliseBrandContext,
} from "./customer-context";

type BrandArg = Parameters<typeof normaliseBrandContext>[0];
type ArtistArg = Parameters<typeof normaliseArtistContext>[0];

function brandRow(overrides: Partial<BrandArg> = {}): BrandArg {
  return {
    name: "Acme Coffee",
    description: null,
    industry: null,
    productsServices: null,
    visualStyle: null,
    imageryStyle: null,
    typography: null,
    personality: null,
    voice: null,
    tone: null,
    preferredLayouts: null,
    targetAudience: null,
    valueProposition: null,
    references: null,
    colors: null,
    ...overrides,
  } as BrandArg;
}

function artistRow(overrides: Partial<ArtistArg> = {}): ArtistArg {
  return {
    name: "Nightwave",
    bio: null,
    genre: null,
    visualIdentity: null,
    creativePreferences: null,
    location: null,
    colors: null,
    ...overrides,
  } as ArtistArg;
}

test("brand context shows only the fields the customer actually filled in", () => {
  const context = normaliseBrandContext(
    brandRow({ industry: "Specialty coffee", voice: "Warm and grounded" }),
  );
  assert.equal(context.kind, "brand");
  assert.equal(context.hasContent, true);
  const labels = context.facts.map((fact) => fact.label);
  assert.deepEqual(labels, ["Industry", "Voice"]);
  // Empty fields are not rendered at all — nothing is invented.
  assert.ok(!labels.includes("Description"));
  assert.ok(!labels.includes("Tone"));
});

test("a brand with only a name records no production content (honest empty)", () => {
  const context = normaliseBrandContext(brandRow({ name: "Nameless" }));
  assert.equal(context.hasContent, false);
  assert.deepEqual(context.facts, []);
  assert.deepEqual(context.colours, []);
  assert.equal(context.name, "Nameless");
});

test("a fully blank brand (no name) is still an honest empty state", () => {
  const context = normaliseBrandContext(brandRow({ name: "   " }));
  assert.equal(context.name, null);
  assert.equal(context.hasContent, false);
});

test("typography is condensed into one readable line when present", () => {
  const context = normaliseBrandContext(
    brandRow({ typography: { headingFont: "Serif", bodyFont: "Sans" } }),
  );
  const typography = context.facts.find((fact) => fact.label === "Typography");
  assert.ok(typography);
  assert.match(typography!.value, /Headings: Serif/);
  assert.match(typography!.value, /Body: Sans/);
});

test("a malformed or absent typography object yields no typography fact", () => {
  const context = normaliseBrandContext(brandRow({ typography: {} }));
  assert.ok(!context.facts.some((fact) => fact.label === "Typography"));
});

test("colour swatches are painted only for valid colours; the rest stay text", () => {
  const { swatches, text } = colourSwatches({
    primary: "#123456",
    secondary: "  ",
    accent: "hsl(200 50% 50%)",
    background: "as bold as it gets",
  });
  assert.deepEqual(
    swatches.map((s) => s.role),
    ["Primary", "Accent"],
  );
  assert.deepEqual(text, [{ label: "Background colour", value: "as bold as it gets" }]);
});

test("a null palette produces neither swatches nor text", () => {
  const { swatches, text } = colourSwatches(null);
  assert.deepEqual(swatches, []);
  assert.deepEqual(text, []);
});

test("isPaintableColour accepts real colours and rejects prose", () => {
  for (const ok of ["#fff", "#ffff", "#123456", "#123456ff", "rgb(1 2 3)", "hsl(200 50% 50%)", "rgba(1,2,3,0.5)"]) {
    assert.equal(isPaintableColour(ok), true, `expected paintable: ${ok}`);
  }
  for (const no of ["blue", "#12", "#123456789", "url(evil)", "red; }", ""]) {
    assert.equal(isPaintableColour(no), false, `expected rejected: ${no}`);
  }
});

test("a valid colour on a brand becomes a swatch, not a text fact", () => {
  const context = normaliseBrandContext(brandRow({ colors: { primary: "#0a0a0a" } }));
  assert.deepEqual(context.colours, [{ role: "Primary", colour: "#0a0a0a" }]);
  assert.equal(context.hasContent, true);
  assert.ok(!context.facts.some((fact) => fact.label === "Primary colour"));
});

test("an artist context is present-only and carries its own palette", () => {
  const context = normaliseArtistContext(
    artistRow({ genre: "Synthwave", colors: { accent: "#ff00ff" } }),
  );
  assert.equal(context.kind, "artist");
  assert.deepEqual(
    context.facts.map((fact) => fact.label),
    ["Genre"],
  );
  assert.deepEqual(context.colours, [{ role: "Accent", colour: "#ff00ff" }]);
  assert.equal(context.hasContent, true);
});

test("an artist who supplied nothing records no content", () => {
  const context = normaliseArtistContext(artistRow());
  assert.equal(context.hasContent, false);
  assert.deepEqual(context.facts, []);
  assert.deepEqual(context.colours, []);
});
