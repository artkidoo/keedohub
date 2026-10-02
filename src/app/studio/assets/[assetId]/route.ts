/**
 * Internal asset preview: GET /studio/assets/[assetId] (Phase 4.3, spec §11, §12).
 *
 * Serves one stored file to a signed-in KeedoHub operator so the production
 * workspace can show what was uploaded. It exists as its own route, under the
 * private `/studio` namespace, for four reasons:
 *
 *   1. It authorises independently. Route handlers do not run layouts, so this
 *      does not rely on the Studio layout's check: it resolves the session and a
 *      LIVE operator record on every request, and refuses everyone else.
 *   2. It fails closed and indistinguishably. A malformed id, an unknown id, an
 *      id the caller cannot resolve, a file the store refuses to hand over and
 *      a missing file all answer 404, so this endpoint cannot be used to
 *      discover whether a record exists.
 *   3. It never leaks storage. The asset id is resolved to a workspace, a
 *      deliverable and a storage key server-side; the key is never returned, and
 *      the file is never given a public URL.
 *   4. It decides the content type itself. Only a tightly allow-listed raster
 *      image is served inline with its own type; anything else is sent as an
 *      opaque download. The browser's claimed mime and the stored mime are
 *      hints, never proof (spec §11).
 *
 * The response is always `Cache-Control: private, no-store` with `nosniff`, so
 * an internal production file is never cached by a shared proxy, never indexed,
 * and never interpreted as a different type than the one we named.
 *
 * A missing file is a 404 with nothing logged: the record named a location whose
 * bytes are gone, so the answer is "nothing here" rather than a server error.
 * Only an error the operator cannot act on (a misconfigured or broken store)
 * reaches the logs as a 500.
 */

import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { auth } from "@/domains/auth/server";
import { classifyPreview } from "@/domains/creative/output";
import { deliverableExists, loadAssetForPreview } from "@/domains/creative/preview";
import { resolveOperator } from "@/domains/production/access";
import { createStorageProvider, StorageError } from "@/lib/storage";
import { isValidUUIDv4 } from "@/lib/validation/id";

/** An authenticated route, never cached and never prerendered. */
export const dynamic = "force-dynamic";

/** The one refusal this route gives: existence is never revealed. */
function notFoundResponse(): Response {
  return new Response("Not found", { status: 404 });
}

/**
 * A filename safe to put in a `Content-Disposition` header: ASCII only, no
 * quotes, no control characters and no line breaks, so a stored name can never
 * inject a header or terminate the value early.
 */
function safeHeaderFilename(name: string): string {
  const cleaned = Array.from(name)
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      if (code < 32 || code === 127) return "";
      if (character === '"' || character === "\\") return "";
      return character;
    })
    .join("")
    .trim()
    .slice(0, 180);

  return cleaned || "file";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;

  // Before any query: a malformed id is a missing record, never a database
  // error and never a hint that some other record exists.
  if (!isValidUUIDv4(assetId)) return notFoundResponse();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return notFoundResponse();

  const access = await resolveOperator(session.user.id);
  if (!access) return notFoundResponse();

  const asset = await loadAssetForPreview(access, assetId);
  if (!asset) return notFoundResponse();

  // A file whose deliverable has been removed is not served, so a deleted piece
  // of work cannot leave a readable orphan behind.
  if (!(await deliverableExists(asset.deliverableId))) return notFoundResponse();

  const preview = classifyPreview({
    filename: asset.filename,
    mimeType: asset.mimeType,
  });

  let bytes: Buffer;
  try {
    bytes = await createStorageProvider().read(asset.storageKey);
  } catch (error) {
    // `notFound()` and `forbidden()` are factory functions that return a
    // StorageError, so the kind — not the constructor — is the reliable test
    // (the customer file route does the same). A record whose bytes are gone
    // and a key the store refuses to name both answer 404 with nothing logged;
    // only a genuinely broken store reaches the log as a 500.
    if (error instanceof StorageError && (error.kind === "NotFound" || error.kind === "Forbidden")) {
      return notFoundResponse();
    }
    console.error("Studio asset preview failed:", error);
    return new Response("Internal server error", { status: 500 });
  }

  const filename = safeHeaderFilename(asset.filename);

  return new Response(new Uint8Array(bytes), {
    headers: {
      // Only an allow-listed raster image is served with a paintable type.
      // Everything else is opaque, so a stored document can never execute.
      "Content-Type": preview.inlineImage
        ? (asset.mimeType ?? "application/octet-stream")
        : "application/octet-stream",
      "Content-Disposition": preview.inlineImage
        ? `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
        : `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
