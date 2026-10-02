/**
 * Internal file preview (Phase 4.3, spec §12).
 *
 * An operator must be able to tell what they uploaded. This component does that
 * with two honest presentations and no third option:
 *
 *   • a raster image the browser can safely paint, shown inline;
 *   • everything else — a PDF, a PSD, a video, a font — shown as a professional
 *     file card with its real name, type and size.
 *
 * It deliberately does not sniff the bytes and does not read the file: the
 * decision comes from `classifyPreview`, which only ever says "image" for a
 * tightly allow-listed set of raster types (an SVG is never painted inline). The
 * bytes themselves come from an operator-gated route that pins the content type
 * and refuses to cache — so a stored value can never turn this into an attack
 * surface, and this is not a browser-based editor.
 */

import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { classifyPreview, formatBytes } from "./output";

/** The asset fields the preview needs. Only describing fields; never a key. */
export type PreviewableAsset = {
  id: string;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  /** The version this file belongs to, when it is a version's file. */
  version?: number | null;
  /** Internal asset category, when known. */
  category?: string | null;
  /** Whether the customer can see it, when known. */
  customerVisible?: boolean | null;
  createdAt?: Date | null;
};

/** Internal wording for an asset category. */
const categoryLabels: Record<string, string> = {
  reference: "Reference",
  identity: "Identity",
  source: "Working file",
  delivered: "Produced output",
  library: "Library",
};

function formatInstant(value: Date | null | undefined): string {
  if (!value) return "";
  return `${value.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

/** The metadata lines the preview can honestly show for one file. */
function factsFor(asset: PreviewableAsset): string[] {
  const facts: string[] = [];
  if (typeof asset.version === "number" && asset.version > 0) {
    facts.push(`Version ${asset.version}`);
  }
  if (asset.category && categoryLabels[asset.category]) {
    facts.push(categoryLabels[asset.category]);
  }
  if (asset.mimeType) facts.push(asset.mimeType);
  const size = formatBytes(asset.sizeBytes);
  if (size !== "—") facts.push(size);
  const created = formatInstant(asset.createdAt);
  if (created) facts.push(created);
  return facts;
}

/**
 * One stored file, previewed. `caption` is where the caller says what the file
 * is in context ("Current output", "Customer reference"), so the same component
 * can serve the version history and the reference panel without a second copy.
 */
export function ProductionFilePreview({
  asset,
  caption,
}: {
  asset: PreviewableAsset;
  /** A short label for what this file is in context. */
  caption?: string;
}) {
  const preview = classifyPreview({ filename: asset.filename, mimeType: asset.mimeType });
  const facts = factsFor(asset);

  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-2">
        {caption ? (
          <figcaption className="text-eyebrow uppercase text-muted-foreground">
            {caption}
          </figcaption>
        ) : null}

        {preview.inlineImage ? (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {/* The bytes come from the operator-gated /studio/assets route, which
                sets a pinned content type, nosniff and private, no-store. Next's
                image optimiser would have to fetch that route server-side, which
                is exactly what that route is built to refuse, so a plain <img>
                is the correct element here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/studio/assets/${asset.id}`}
              alt={`${asset.filename}${typeof asset.version === "number" && asset.version > 0 ? `, version ${asset.version}` : ""}`}
              loading="lazy"
              decoding="async"
              className="max-h-96 w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface px-4 py-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-elevated text-muted-foreground">
              <FileText aria-hidden className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-medium text-foreground">
                {asset.filename}
              </span>
              <span className="text-meta text-muted-foreground">
                {asset.mimeType ?? "Unknown file type"} — no inline preview for this
                format. Open it from your own tools.
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        {typeof asset.customerVisible === "boolean" ? (
          <Badge variant={asset.customerVisible ? "success" : "neutral"}>
            {asset.customerVisible ? "Shared with the customer" : "Internal only"}
          </Badge>
        ) : null}
        {facts.length ? (
          <span className="text-meta break-words text-muted-foreground">
            {facts.join(" · ")}
          </span>
        ) : null}
      </div>
    </figure>
  );
}
