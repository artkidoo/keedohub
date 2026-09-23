import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { SectionPlaceholder } from "@/components/workspace/section-placeholder";
import {
  findNavItemBySlug,
  getContextMeta,
  isWorkspaceContext,
  navIcon,
} from "@/lib/navigation";

type SectionPageProps = {
  params: Promise<{ context: string; section: string }>;
};

export async function generateMetadata({ params }: SectionPageProps) {
  const { context, section } = await params;
  const item = isWorkspaceContext(context)
    ? findNavItemBySlug(context, section)
    : undefined;
  return { title: item?.label ?? "Workspace" };
}

/**
 * Workspace section placeholder.
 *
 * The section slug is validated against the context navigation, so only real
 * destinations resolve — anything else is a 404. The screen is deliberately
 * empty rather than filled with invented content.
 */
export default async function WorkspaceSectionPage({
  params,
}: SectionPageProps) {
  const { context, section } = await params;

  if (!isWorkspaceContext(context)) {
    notFound();
  }

  const item = findNavItemBySlug(context, section);
  const meta = getContextMeta(context);

  if (!item || !meta) {
    notFound();
  }

  const sectionIcon = navIcon(item.icon);

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

      {/* Shared copy and markup, identical wherever a placeholder resolves. */}
      <SectionPlaceholder icon={sectionIcon} backHref={meta.href} />
    </Container>
  );
}