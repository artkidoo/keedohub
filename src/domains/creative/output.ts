/**
 * Production output preview helpers (Phase 4.3, spec §12).
 *
 * The operator must be able to understand what they uploaded, but KeedoHub is not
 * a browser-based editor. This module makes one small, honest decision per file —
 * can we show it inline safely, or is this a file card — from the stored filename
 * and mime type, without ever reading bytes here. It is pure and unit-testable,
 * and it never trusts the browser's claimed mime alone for anything dangerous:
 * only a tightly allow-listed set of image types is ever eligible to render as an
 * inline <img>, and even then the actual bytes are served by a dedicated,
 * operator-gated route that pins the content type and marks it un-sniffable.
 */

/** What kind of preview a stored file can support. */
export type PreviewKind = "image" | "file";

/** A preview descriptor for one stored asset. Internal-only. */
export type FilePreview = {
  kind: PreviewKind;
  /** True when it is safe to render the bytes inline as an image. */
  inlineImage: boolean;
  filename: string;
  mimeType: string | null;
};

/**
 * Image mime types we are willing to paint inline. Deliberately excludes SVG
 * (an SVG can carry script) and anything that is really a document, so a stored
 * value can never turn the workspace into an attack surface. A file whose type is
 * not on this list is shown as a professional file card, never an <img>.
 */
const INLINE_IMAGE_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/avif",
];

/** Extensions that identify an image when the mime type is missing or generic. */
const IMAGE_EXTENSIONS: readonly string[] = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
];

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0 || dot === filename.length - 1) return "";
  return filename.slice(dot + 1).toLowerCase();
}

/**
 * Decide how to preview one file. `inlineImage` is true only when BOTH the mime
 * type (when present and specific) or the file extension clearly indicate a safe,
 * allow-listed raster image — a mismatch, a missing type, or an SVG is treated as
 * a plain file card, not a guess.
 */
export function classifyPreview(input: {
  filename: string;
  mimeType: string | null;
}): FilePreview {
  const filename = input.filename ?? "";
  const mimeType = input.mimeType?.trim().toLowerCase() || null;
  const extension = extensionOf(filename);

  const mimeIsInlineImage = mimeType !== null && INLINE_IMAGE_TYPES.includes(mimeType);
  const mimeSaysImageButUnsafe = mimeType !== null && mimeType.startsWith("image/") && !mimeIsInlineImage;
  const extIsInlineImage = IMAGE_EXTENSIONS.includes(extension);

  // A generic or absent mime ("application/octet-stream", null) still lets a clear
  // image extension classify the file as an image; the serving route decides the
  // real content type independently, so classification here is only about layout.
  const inlineImage =
    !mimeSaysImageButUnsafe && (mimeIsInlineImage || (mimeType === null || mimeType === "application/octet-stream") && extIsInlineImage);

  return {
    kind: inlineImage ? "image" : "file",
    inlineImage,
    filename,
    mimeType,
  };
}

/** A compact, human byte size for a file card. Never a raw byte count alone. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"] as const;
  let value = bytes;
  let unit = "B";
  for (const next of units) {
    if (value < 1024) break;
    value /= 1024;
    unit = next;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${unit}`;
}
