import { notFound } from "next/navigation";

import { OutputDetailView } from "@/components/outputs/detail";
import { getOutput } from "@/domains/outputs/data";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  isWorkspaceContext,
} from "@/lib/navigation";
import { isValidUUIDv4 } from "@/lib/validation/id";

type MarketingDetailPageProps = {
  params: Promise<{ context: string; id: string }>;
};

/**
 * Hard-404 architecture (verified Checkpoints 2.3/2.4): authorization and
 * notFound() run in generateMetadata and at the top of the component, before
 * any Suspense boundary, so foreign, malformed, missing and wrong-family ids
 * all stream a real 404. No loading.tsx under this route.
 */
export async function generateMetadata({ params }: MarketingDetailPageProps) {
  const { context, id } = await params;
  if (
    isWorkspaceContext(context) &&
    isValidUUIDv4(id) &&
    findNavItemBySlug(context, "marketing")
  ) {
    const access = await requireWorkspaceContext(context);
    const entry = await getOutput(access, context, "marketing", id);
    if (entry) return { title: entry.name };
  }
  notFound();
}

/** One marketing output: what it is, which project made it, and its files. */
export default async function MarketingDetailPage({
  params,
}: MarketingDetailPageProps) {
  const { context, id } = await params;
  if (!isWorkspaceContext(context) || !isValidUUIDv4(id)) notFound();
  const item = findNavItemBySlug(context, "marketing");
  if (!item) notFound();

  const access = await requireWorkspaceContext(
    context,
    `/workspace/${context}/marketing/${id}`,
  );
  // Family is part of the lookup: a document id can never open here.
  const entry = await getOutput(access, context, "marketing", id);
  if (!entry) notFound();

  return (
    <OutputDetailView
      access={access}
      context={context}
      family="marketing"
      entry={entry}
    />
  );
}