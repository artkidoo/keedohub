import { notFound } from "next/navigation";

import { ReleaseDetailView } from "@/components/releases/detail";
import { getRelease } from "@/domains/releases/data";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  isWorkspaceContext,
} from "@/lib/navigation";
import { isValidUUIDv4 } from "@/lib/validation/id";

type ReleaseDetailPageProps = {
  params: Promise<{ context: string; id: string }>;
};

/**
 * Hard-404 architecture (verified Checkpoints 2.3–2.5): notFound() is decided
 * during generateMetadata and at the TOP of the page component, before any
 * Suspense boundary exists in the rendered tree, so foreign, malformed,
 * missing, non-release and wrong-context ids all stream a real 404. No
 * loading.tsx exists anywhere under this route — do not add one above `[id]`.
 */
export async function generateMetadata({ params }: ReleaseDetailPageProps) {
  const { context, id } = await params;
  if (
    isWorkspaceContext(context) &&
    isValidUUIDv4(id) &&
    findNavItemBySlug(context, "releases")
  ) {
    const access = await requireWorkspaceContext(context);
    const release = await getRelease(access, context, id);
    if (release) return { title: release.name };
  }
  notFound();
}

/**
 * One release: what it is, its artwork and files, and where it has got to —
 * no production machinery.
 */
export default async function ReleaseDetailPage({
  params,
}: ReleaseDetailPageProps) {
  const { context, id } = await params;
  if (!isWorkspaceContext(context) || !isValidUUIDv4(id)) notFound();
  if (!findNavItemBySlug(context, "releases")) notFound();

  const access = await requireWorkspaceContext(
    context,
    `/workspace/${context}/releases/${id}`,
  );
  // `release_type` is part of the lookup: an ordinary project (or another
  // customer's id) can never open here.
  const release = await getRelease(access, context, id);
  if (!release) notFound();

  return (
    <ReleaseDetailView access={access} context={context} release={release} />
  );
}