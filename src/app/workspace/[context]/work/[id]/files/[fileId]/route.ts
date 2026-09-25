import { getWorkFile } from "@/domains/dashboard/queries";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import { isWorkspaceContext } from "@/lib/navigation";
import {
  createStorageProvider,
  StorageError,
} from "@/lib/storage";
import { isValidUUIDv4 } from "@/lib/validation/id";

/** Private, read-only download. The same visibility predicate protects the file list. */
export async function GET(_request: Request, { params }: {
  params: Promise<{ context: string; id: string; fileId: string }>;
}) {
  const { context, id, fileId } = await params;
  if (!isWorkspaceContext(context) || !isValidUUIDv4(id) || !isValidUUIDv4(fileId)) {
    return new Response("Not found", { status: 404 });
  }
  const access = await requireWorkspaceContext(context);
  const file = await getWorkFile(access, context, id, fileId);
  if (!file) return new Response("Not found", { status: 404 });
  try {
    const storage = createStorageProvider();
    const bytes = await storage.read(storage.getKey(access.workspace.slug, file.deliverableId, file.id));
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.id}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    // A recorded file whose bytes are missing is genuinely "not found";
    // other storage failures are a customer-facing service problem.
    if (error instanceof StorageError && error.kind === "NotFound") {
      return new Response("Not found", { status: 404 });
    }
    console.error("Customer download unavailable:", error);
    return new Response("The file could not be loaded. Please try again.", { status: 503 });
  }
}
