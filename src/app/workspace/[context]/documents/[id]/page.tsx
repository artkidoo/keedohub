import { notFound } from "next/navigation";

import { OutputDetailView } from "@/components/outputs/detail";
import { getOutput } from "@/domains/outputs/data";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  isWorkspaceContext,
} from "@/lib/navigation";
import { isValidUUIDv4 } from "@/lib/validation/id";

type DocumentDetailPageProps = {
  params: Promise<{ context: string; id: string }>;
};

/**
 * Hard-404 architecture (verified Checkpoints 2.3/2.4): notFound() is decided
 * during generateMetadata and at the TOP of the page component, before any
 * Suspense boundary exists in the tree, so a foreign, malformed, missing or
 * wrong-family document id streams a real 404. No loading.tsx exists anywhere
 * under this route — do not add one above `[id]`.
 */
export async function generateMetadata({ params }: DocumentDetailPageProps) {
  const { context, id } = await params;
  if (
    isWorkspaceContext(context) &&
    isValidUUIDv4(id) &&
    findNavItemBySlug(context, "documents")
  ) {
    const access = await requireWorkspaceContext(context);
    const entry = await getOutput(access, context, "document", id);
    if (entry) return { title: entry.name };
  }
  notFound();
}

/** One document: what it is, which project made it, and its files. */
export default async function DocumentDetailPage({
  params,
}: DocumentDetailPageProps) {
  const { context, id } = await params;
  if (!isWorkspaceContext(context) || !isValidUUIDv4(id)) notFound();
  const item = findNavItemBySlug(context, "documents");
  if (!item) notFound();

  const access = await requireWorkspaceContext(
    context,
    `/workspace/${context}/documents/${id}`,
  );
  // Family is part of the lookup: a marketing id can never open here.
  const entry = await getOutput(access, context, "document", id);
  if (!entry) notFound();

  return (
    <OutputDetailView
      access={access}
      context={context}
      family="document"
      entry={entry}
    />
  );
}