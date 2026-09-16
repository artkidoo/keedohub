/**
 * Single asset endpoint: GET /api/assets/[id], DELETE /api/assets/[id]
 *
 * Returns or removes the raw bytes of the requested asset. The asset is
 * located by resolving its owning workspace from the database and then
 * reading from the configured storage provider (local or S3).
 *
 * Authorization:
 *   - The caller must be authenticated (via the auth session).
 *   - The caller must own the workspace that owns the deliverable that owns
 *     this asset (resolved through the database).
 *   - When the storage provider returns NotFound, the route responds 404.
 *   - When the caller lacks access, the route responds 403.
 */

import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { auth } from "@/domains/auth/server";
import { assertValidUUIDv4 } from "@/lib/validation/id";
import {
  createStorageProvider,
  notFound as storageNotFound,
  forbidden as storageForbidden,
} from "@/lib/storage";

/**
 * Current authenticated user, or null when unauthenticated.
 */
async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user ?? null;
}

/**
 * Resolve the asset's owning workspace slug and verify the caller owns it.
 *
 * Returns the workspace slug when the caller is the owner; `null` when the
 * asset does not exist or the caller lacks ownership.
 */
async function resolveAssetAccess(
  assetId: string,
  userId: string,
): Promise<string | null> {
  assertValidUUIDv4(assetId);

  const db = getDb();

  const assetRow = await db.query.asset.findFirst({
    where: (a, { eq }) => eq(a.id, assetId),
    with: {
      deliverable: {
        with: {
          workspace: true,
        },
      },
    },
  });

  if (!assetRow) {
    return null;
  }

  const ws = assetRow.deliverable?.workspace;
  if (!ws || !assetRow.deliverable || ws.userId !== userId) {
    return null;
  }

  return ws.slug;
}

/**
 * GET /api/assets/[id]
 *
 * Stream the asset bytes to the client with the appropriate content type.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const slug = await resolveAssetAccess(id, user.id);
  if (!slug) {
    return new Response("Not found", { status: 404 });
  }

  const storage = createStorageProvider();
  const db = getDb();

  const assetRow = await db.query.asset.findFirst({
    where: (a, { eq }) => eq(a.id, id),
  });

  if (!assetRow) {
    return new Response("Not found", { status: 404 });
  }

  const key = storage.getKey(slug, assetRow.deliverableId as string, id);

  try {
    const bytes = await storage.read(key);
    const contentType = assetRow.mimeType || "application/octet-stream";

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof storageNotFound) {
      return new Response("Not found", { status: 404 });
    }
    if (error instanceof storageForbidden) {
      return new Response("Forbidden", { status: 403 });
    }
    console.error("Asset read failed:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

/**
 * DELETE /api/assets/[id]
 *
 * Delete the asset. Only the workspace owner can delete assets.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const slug = await resolveAssetAccess(id, user.id);
  if (!slug) {
    return new Response("Not found", { status: 404 });
  }

  const storage = createStorageProvider();
  const db = getDb();

  const assetRow = await db.query.asset.findFirst({
    where: (a, { eq }) => eq(a.id, id),
  });

  if (!assetRow) {
    return new Response("Not found", { status: 404 });
  }

  const key = storage.getKey(slug, assetRow.deliverableId as string, id);

  try {
    await storage.delete(key);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof storageNotFound) {
      return new Response("Not found", { status: 404 });
    }
    if (error instanceof storageForbidden) {
      return new Response("Forbidden", { status: 403 });
    }
    console.error("Asset delete failed:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
