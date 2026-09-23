import { notFound } from "next/navigation";

import { AssetDetailView } from "@/components/releases/asset-detail";
import { getArtistAsset } from "@/domains/releases/data";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  isWorkspaceContext,
} from "@/lib/navigation";
import { isValidUUIDv4 } from "@/lib/validation/id";

type AssetDetailPageProps = {
  params: Promise<{ context: string; id: string }>;
};

/**
 * Hard-404 architecture (verified Checkpoints 2.3–2.5): notFound() is decided
 * during generateMetadata and at the TOP of the page component, before any
 * Suspense boundary exists in the rendered tree, so foreign, malformed,
 * missing and wrong-context asset ids all stream a real 404. No loading.tsx
 * exists anywhere under this route — do not add one above `[id]`.
 */
export async function generateMetadata({ params }: AssetDetailPageProps) {
  const { context, id } = await params;
  if (
    isWorkspaceContext(context) &&
    context === "artist" &&
    isValidUUIDv4(id) &&
    findNavItemBySlug(context, "assets")
  ) {
    const access = await requireWorkspaceContext(context);
    const item = await getArtistAsset(access, context, id);
    if (item) return { title: item.filename };
  }
  notFound();
}

/**
 * One asset from the artist's library: the file, its size, where it came
 * from, and one secure download. No storage or production detail.
 */
export default async function AssetDetailPage({
  params,
}: AssetDetailPageProps) {
  const { context, id } = await params;
  if (
    !isWorkspaceContext(context) ||
    context !== "artist" ||
    !isValidUUIDv4(id)
  ) {
    notFound();
  }
  if (!findNavItemBySlug(context, "assets")) notFound();

  const access = await requireWorkspaceContext(
    context,
    `/workspace/${context}/assets/${id}`,
  );
  // `visibleFileScope` is the lookup: a hidden, internal or another
  // customer's file id resolves to null here and streams a 404.
  const item = await getArtistAsset(access, context, id);
  if (!item) notFound();

  return <AssetDetailView context={context} item={item} />;
}