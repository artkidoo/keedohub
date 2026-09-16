import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProfileFoundation } from "@/components/workspace/profile-foundation";
import {
  findNavItemBySlug,
  getContextMeta,
  isWorkspaceContext,
  navIcon,
} from "@/lib/navigation";
import { workspaceHome } from "@/lib/workspace";
import { cn } from "@/lib/utils";

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
  const isProfile = section === "profile";

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

      {isProfile ? (
        <ProfileFoundation
          contextLabel={meta.label}
          profileHref={item.href}
          groups={workspaceHome[context].groups}
        />
      ) : (
        <EmptyState
          icon={sectionIcon}
          title="This area is being built"
          description="The shell, navigation and design system are in place. This space will hold real work as the workspace is completed — nothing is faked here in the meantime."
          action={
            <Link
              href={meta.href}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <ArrowLeft aria-hidden />
              Back to dashboard
            </Link>
          }
        />
      )}
    </Container>
  );
}