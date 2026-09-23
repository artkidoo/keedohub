import { Megaphone } from "lucide-react";
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

type MarketingPageProps = {
  params: Promise<{ context: string }>;
};

export async function generateMetadata({ params }: MarketingPageProps) {
  const { context } = await params;
  const item = isWorkspaceContext(context)
    ? findNavItemBySlug(context, "marketing")
    : undefined;
  return { title: item?.label ?? "My Marketing" };
}

/**
 * "My Marketing" — marketing creative KeedoHub has produced for the Brand
 * (Checkpoint 2.5).
 *
 * Marketing means marketing *outputs* — social kits, promotional creative,
 * content packs — never campaigns, scheduling or automation: no campaign model
 * exists anywhere in this feature. Brand-only via the same navigation check as
 * Documents, and every row is a real customer-visible deliverable whose file
 * count comes from the database.
 */
export default async function MarketingPage({ params }: MarketingPageProps) {
  const { context } = await params;
  if (!isWorkspaceContext(context)) notFound();
  const item = findNavItemBySlug(context, "marketing");
  const meta = getContextMeta(context);
  if (!item || !meta) notFound();

  const listPath = `/workspace/${context}/marketing`;
  const access = await requireWorkspaceContext(context, listPath);
  const family = outputFamilies.marketing;

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:gap-10 sm:py-12">
      <PageHeader
        breadcrumb={[
          { label: `${meta.label} workspace`, href: meta.href },
          { label: item.label },
        ]}
        eyebrow={`${meta.label} marketing`}
        title={item.label}
        description={family.description}
      />
      <Suspense fallback={<OutputListSkeleton />}>
        <OutputRows
          access={access}
          context={context}
          family="marketing"
          listPath={listPath}
          icon={Megaphone}
        />
      </Suspense>
    </Container>
  );
}