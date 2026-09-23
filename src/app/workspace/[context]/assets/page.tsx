import { Images } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { AssetListSkeleton, AssetRows } from "@/components/releases/assets";
import { SectionPlaceholder } from "@/components/workspace/section-placeholder";
import { artistAreaCopy } from "@/domains/releases/taxonomy";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  getContextMeta,
  isWorkspaceContext,
  navIcon,
} from "@/lib/navigation";

type AssetsPageProps = {
  params: Promise<{ context: string }>;
};

export async function generateMetadata({ params }: AssetsPageProps) {
  const { context } = await params;
  const item = isWorkspaceContext(context)
    ? findNavItemBySlug(context, "assets")
    : undefined;
  return { title: item?.label ?? "My Assets" };
}

/**
 * "My Assets" — the artist's library (Checkpoint 2.6).
 *
 * This checkpoint's library is the Artist area: Brand's own "My Assets"
 * remains the shared unfinished placeholder (the Customer Library arrives in
 * a later checkpoint), so this route renders that same placeholder for
 * non-artist contexts instead of inventing brand content.
 */
export default async function AssetsPage({ params }: AssetsPageProps) {
  const { context } = await params;
  if (!isWorkspaceContext(context)) notFound();
  const item = findNavItemBySlug(context, "assets");
  const meta = getContextMeta(context);
  if (!item || !meta) notFound();

  const listPath = `/workspace/${context}/assets`;
  const access = await requireWorkspaceContext(context, listPath);

  if (context !== "artist") {
    // Shared copy and markup, identical to the dynamic [section] route.
    return (
      <Container className="flex flex-col gap-8 py-8 sm:gap-10 sm:py-12">
        <PageHeader
          breadcrumb={[
            { label: `${meta.label} workspace`, href: meta.href },
            { label: item.label },
          ]}
          title={item.label}
          description={item.description}
        />
        <SectionPlaceholder icon={navIcon(item.icon)} backHref={meta.href} />
      </Container>
    );
  }

  const copy = artistAreaCopy.assets;

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:gap-10 sm:py-12">
      <PageHeader
        breadcrumb={[
          { label: `${meta.label} workspace`, href: meta.href },
          { label: item.label },
        ]}
        eyebrow={`${meta.label} assets`}
        title={item.label}
        description={copy.description}
      />
      {/* List loading via Suspense (the established 2.3–2.5 pattern). No
          loading.tsx exists at or above any [id] segment under this route. */}
      <Suspense fallback={<AssetListSkeleton />}>
        <AssetRows
          access={access}
          context={context}
          listPath={listPath}
          icon={Images}
        />
      </Suspense>
    </Container>
  );
}