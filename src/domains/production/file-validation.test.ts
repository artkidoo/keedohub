/**
 * Production file validation (Phase 3.1, hardened in Phase 4.3 spec §11).
 *
 * The upload validator is the only thing standing between a browser and a
 * version record, so what it accepts and what it refuses is worth pinning: a
 * name must be usable, it must carry a readable extension, the file must not be
 * empty, and it must fit the limit. A hostile name is flattened rather than
 * refused, because the operator still owns their own work — but it can never
 * carry a path, a control character or a leading dot into storage.
 *
 * Pure: no database, no bytes are read.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { ProductionError } from "./errors";
import { MAX_OUTPUT_BYTES } from "./limits";
import { assertUsableFile, hasReadableExtension, safeFilename } from "./output";

/** The code a refusal carried, or null when it was not a production refusal. */
function refusalCode(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof ProductionError ? error.code : "not-a-production-error";
  }
}

/* ==========================================================================
 * Extension
 * ========================================================================== */

test("an upload must carry a readable extension", () => {
  assert.equal(hasReadableExtension("artwork.png"), true);
  assert.equal(hasReadableExtension("master.PSD"), true);
  assert.equal(hasReadableExtension("release notes v2.pdf"), true);
  assert.equal(hasReadableExtension("archive.tar.gz"), true);

  assert.equal(hasReadableExtension("artwork"), false);
  assert.equal(hasReadableExtension("artwork."), false);
  assert.equal(hasReadableExtension(".png"), false);
  assert.equal(hasReadableExtension("artwork.p n g"), false);
  assert.equal(hasReadableExtension("artwork." + "x".repeat(20)), false);
  assert.equal(hasReadableExtension("   "), false);
});

/* ==========================================================================
 * Accepted uploads
 * ========================================================================== */

test("a real production file is accepted", () => {
  assert.equal(
    refusalCode(() => assertUsableFile({ name: "cover-artwork.png", size: 2048, type: "image/png" })),
    null,
  );
  // A file at exactly the limit is accepted; one byte more is not.
  assert.equal(
    refusalCode(() => assertUsableFile({ name: "big.psd", size: MAX_OUTPUT_BYTES })),
    null,
  );
});

/* ==========================================================================
 * Refused uploads
 * ========================================================================== */

test("a nameless, extensionless, empty or oversized upload is refused as invalid input", () => {
  assert.equal(refusalCode(() => assertUsableFile({ name: "", size: 10 })), "invalid_input");
  assert.equal(refusalCode(() => assertUsableFile({ name: "   ", size: 10 })), "invalid_input");
  assert.equal(refusalCode(() => assertUsableFile({ name: "artwork", size: 10 })), "invalid_input");
  assert.equal(refusalCode(() => assertUsableFile({ name: "artwork.png", size: 0 })), "invalid_input");
  assert.equal(refusalCode(() => assertUsableFile({ name: "artwork.png", size: -5 })), "invalid_input");
  assert.equal(
    refusalCode(() => assertUsableFile({ name: "artwork.png", size: Number.NaN })),
    "invalid_input",
  );
  assert.equal(
    refusalCode(() => assertUsableFile({ name: "artwork.png", size: MAX_OUTPUT_BYTES + 1 })),
    "invalid_input",
  );
});

/* ==========================================================================
 * Stored filenames are flattened, never trusted
 * ========================================================================== */

test("a filename can never carry a path or a control character into storage", () => {
  assert.equal(safeFilename("../../etc/passwd"), "etc-passwd");
  assert.equal(safeFilename("folder\\sub\\artwork.png"), "folder-sub-artwork.png");
  assert.equal(safeFilename("....hidden.png"), "hidden.png");
  assert.equal(safeFilename("line\nbreak.png"), "linebreak.png");
  assert.equal(safeFilename("bell\u0007.png"), "bell.png");
  assert.equal(safeFilename("  spaced  .png  "), "spaced  .png");
});

test("a filename with nothing usable left still becomes something storable", () => {
  assert.equal(safeFilename("   "), "output");
  assert.equal(safeFilename("///"), "output");
  assert.equal(safeFilename("..."), "output");
});

test("a filename is bounded so it can never overflow a column", () => {
  assert.equal(safeFilename(`${"a".repeat(400)}.png`).length, 180);
});
