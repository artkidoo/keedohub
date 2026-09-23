import { Disc3 } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { ReleaseListSkeleton, ReleaseRows } from "@/components/releases/list";
import { artistAreaCopy } from "@/domains/releases/taxonomy";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  getContextMeta,
  isWorkspaceContext,
} from "@/lib/navigation";

type ReleasesPageProps = {
  params: Promise<{ context: string }>;
};

export async function generateMetadata({ params }: ReleasesPageProps) {
  const { context } = await params;
  const item = isWorkspaceContext(context)
    ? findNavItemBySlug(context, "releases")
    : undefined;
  return { title: item?.label ?? "My Releases" };
}

/**
 * "My Releases" — the artist's releases (Checkpoint 2.6).
 *
 * Releases are the Artist context's own area: the navigation lookup validates
 * the slug per context, so contexts without Releases (Brand) resolve to a real
 * 404 rather than an empty Artist page. Content comes only from artist
 * projects carrying release metadata, scoped by `requireWorkspaceContext` +
 * `dashboardScope`. Customers request work instead of creating releases.
 */
export default async function ReleasesPage({ params }: ReleasesPageProps) {
  const { context } = await params;
  if (!isWorkspaceContext(context)) notFound();
  const item = findNavItemBySlug(context, "releases");
  const meta = getContextMeta(context);
  if (!item || !meta) notFound();

  const listPath = `/workspace/${context}/releases`;
  const access = await requireWorkspaceContext(context, listPath);
  const copy = artistAreaCopy.releases;

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:gap-10 sm:py-12">
      <PageHeader
        breadcrumb={[
          { label: `${meta.label} workspace`, href: meta.href },
          { label: item.label },
        ]}
        eyebrow={`${meta.label} releases`}
        title={item.label}
        description={copy.description}
      />
      {/* List loading via Suspense (the established 2.3–2.5 pattern). No
          loading.tsx exists at or above any [id] segment under this route. */}
      <Suspense fallback={<ReleaseListSkeleton />}>
        <ReleaseRows
          access={access}
          context={context}
          listPath={listPath}
          icon={Disc3}
        />
      </Suspense>
    </Container>
  );
}