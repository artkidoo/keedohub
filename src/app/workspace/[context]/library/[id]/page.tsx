import { notFound } from "next/navigation";

import { LibraryFileDetail } from "@/components/library/detail";
import { getLibraryFile } from "@/domains/library/data";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  isWorkspaceContext,
} from "@/lib/navigation";
import { isValidUUIDv4 } from "@/lib/validation/id";

type LibraryDetailPageProps = {
  params: Promise<{ context: string; id: string }>;
};

/**
 * Hard-404 architecture (verified Checkpoints 2.3–2.6): notFound() is decided
 * during generateMetadata and at the TOP of the page component, before any
 * Suspense boundary exists in the rendered tree, so foreign, malformed,
 * missing, wrong-context, undelivered and hidden file ids all stream a real
 * 404. No loading.tsx exists anywhere under this route — do not add one above
 * `[id]`.
 */
export async function generateMetadata({ params }: LibraryDetailPageProps) {
  const { context, id } = await params;
  if (
    isWorkspaceContext(context) &&
    isValidUUIDv4(id) &&
    findNavItemBySlug(context, "library")
  ) {
    const access = await requireWorkspaceContext(context);
    const item = await getLibraryFile(access, context, id);
    if (item) return { title: item.filename };
  }
  notFound();
}

/** One delivered file from the customer's own library. */
export default async function LibraryDetailPage({
  params,
}: LibraryDetailPageProps) {
  const { context, id } = await params;
  if (!isWorkspaceContext(context) || !isValidUUIDv4(id)) notFound();
  if (!findNavItemBySlug(context, "library")) notFound();

  const access = await requireWorkspaceContext(
    context,
    `/workspace/${context}/library/${id}`,
  );
  // `getLibraryFile` is the scoped lookup: a hidden, undelivered, foreign or
  // another context's file id resolves to null here and streams a 404.
  const item = await getLibraryFile(access, context, id);
  if (!item) notFound();

  return <LibraryFileDetail context={context} item={item} />;
}