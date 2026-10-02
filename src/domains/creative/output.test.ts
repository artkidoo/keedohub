/**
 * File preview classification (Phase 4.3, spec §12).
 *
 * The one security-relevant rule here is that a stored file is only ever painted
 * inline when it is unmistakably a safe raster image. These tests pin the
 * conservative answers: SVG is never inline (it can carry script), a mismatch
 * between the claimed type and the extension is never trusted, and a document is
 * always a file card.
 *
 * Pure: no database, no bytes are read.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyPreview, formatBytes } from "./output";

function preview(filename: string, mimeType: string | null) {
  return classifyPreview({ filename, mimeType });
}

/* ==========================================================================
 * What may be painted inline
 * ========================================================================== */

test("a plain raster image is previewed inline", () => {
  for (const [filename, type] of [
    ["artwork.png", "image/png"],
    ["artwork.jpg", "image/jpeg"],
    ["artwork.gif", "image/gif"],
    ["artwork.webp", "image/webp"],
    ["artwork.avif", "image/avif"],
  ]) {
    const result = preview(filename, type);
    assert.equal(result.inlineImage, true, `${filename} should preview inline`);
    assert.equal(result.kind, "image");
  }
});

test("an image is previewed inline even when the type is generic or missing", () => {
  assert.equal(preview("artwork.png", "application/octet-stream").inlineImage, true);
  assert.equal(preview("artwork.PNG", null).inlineImage, true);
  assert.equal(preview("artwork.jpeg", null).inlineImage, true);
});

test("an SVG is never painted inline, whatever it claims to be", () => {
  assert.equal(preview("logo.svg", "image/svg+xml").inlineImage, false);
  assert.equal(preview("logo.svg", "image/svg+xml").kind, "file");
  // A lying extension does not help: an unsupported image type stays a file.
  assert.equal(preview("logo.png", "image/svg+xml").inlineImage, false);
});

test("any other image type is treated as a file, not guessed at", () => {
  for (const type of ["image/tiff", "image/bmp", "image/heic", "image/x-icon"]) {
    assert.equal(preview("artwork.bin", type).inlineImage, false, type);
  }
});

test("documents and working files are file cards", () => {
  const cases: [string, string | null][] = [
    ["brief.pdf", "application/pdf"],
    ["artwork.psd", "image/vnd.photoshop"],
    ["master.wav", "audio/wav"],
    ["report.docx", null],
    ["no-extension", null],
    ["trailing.", null],
  ];

  for (const [filename, type] of cases) {
    const result = preview(filename, type);
    assert.equal(result.inlineImage, false, `${filename} must not preview inline`);
    assert.equal(result.kind, "file");
  }
});

test("classification never invents a type it did not receive", () => {
  const result = preview("artwork.png", null);
  assert.equal(result.mimeType, null);
  assert.equal(result.filename, "artwork.png");
});

/* ==========================================================================
 * Byte sizes are shown in a human unit, never as a bare number
 * ========================================================================== */

test("a file size is reported in a readable unit", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(999), "999 B");
  assert.equal(formatBytes(1024), "1 KB");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(1024 * 1024), "1 MB");
  assert.equal(formatBytes(5 * 1024 * 1024), "5 MB");
  assert.equal(formatBytes(1024 * 1024 * 1024), "1 GB");
});

test("an unknown or impossible size is stated honestly rather than as zero", () => {
  for (const value of [null, undefined, Number.NaN, -1, Number.POSITIVE_INFINITY]) {
    assert.equal(formatBytes(value), "—");
  }
});
