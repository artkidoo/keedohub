import { FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { OutputListSkeleton, OutputRows } from "@/components/outputs/list";
import { outputFamilies } from "@/domains/outputs/taxonomy";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  getContextMeta,
  isWorkspaceContext,
} from "@/lib/navigation";

type DocumentsPageProps = {
  params: Promise<{ context: string }>;
};

export async function generateMetadata({ params }: DocumentsPageProps) {
  const { context } = await params;
  const item = isWorkspaceContext(context)
    ? findNavItemBySlug(context, "documents")
    : undefined;
  return { title: item?.label ?? "My Documents" };
}

/**
 * "My Documents" — the Brand customer's business and brand materials
 * (Checkpoint 2.5).
 *
 * Documents are a Brand area: the navigation lookup validates the slug per
 * context, so the Artist context (which has no such destination) resolves to a
 * real 404 rather than an empty Brand page. Content comes only from
 * customer-visible deliverables and files, scoped by
 * `requireWorkspaceContext` + `dashboardScope`/`visibleFileScope`.
 * No document creation flow exists here: customers request work instead.
 */
export default async function DocumentsPage({ params }: DocumentsPageProps) {
  const { context } = await params;
  if (!isWorkspaceContext(context)) notFound();
  const item = findNavItemBySlug(context, "documents");
  const meta = getContextMeta(context);
  if (!item || !meta) notFound();

  const listPath = `/workspace/${context}/documents`;
  const access = await requireWorkspaceContext(context, listPath);
  const family = outputFamilies.document;

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:gap-10 sm:py-12">
      <PageHeader
        breadcrumb={[
          { label: `${meta.label} workspace`, href: meta.href },
          { label: item.label },
        ]}
        eyebrow={`${meta.label} documents`}
        title={item.label}
        description={family.description}
      />
      {/* List loading via Suspense (the established 2.3/2.4 pattern). No
          loading.tsx exists at or above any [id] segment under this route. */}
      <Suspense fallback={<OutputListSkeleton />}>
        <OutputRows
          access={access}
          context={context}
          family="document"
          listPath={listPath}
          icon={FileText}
        />
      </Suspense>
    </Container>
  );
}