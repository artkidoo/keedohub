import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import {
  artistProfileToFormValues,
  brandProfileToFormValues,
} from "@/domains/profile/fields";
import { ProfileForm } from "@/domains/profile/profile-form";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  getContextMeta,
  isWorkspaceContext,
} from "@/lib/navigation";

type ProfilePageProps = {
  params: Promise<{ context: string }>;
};

export async function generateMetadata({ params }: ProfilePageProps) {
  const { context } = await params;
  const item = isWorkspaceContext(context)
    ? findNavItemBySlug(context, "profile")
    : undefined;
  return { title: item?.label ?? "Profile" };
}

/**
 * Profile management for one context of the caller's workspace.
 *
 * Authorization happens server-side before anything is read: the session is
 * resolved, the caller's own workspace is loaded, and the profile is resolved
 * through it. There is no route that addresses a profile by id, so another
 * customer's profile cannot be opened, named or inferred from here.
 */
export default async function WorkspaceProfilePage({
  params,
}: ProfilePageProps) {
  const { context } = await params;

  if (!isWorkspaceContext(context)) {
    notFound();
  }

  const access = await requireWorkspaceContext(
    context,
    `/workspace/${context}/profile`,
  );
  const meta = getContextMeta(context);
  const item = findNavItemBySlug(context, "profile");

  if (!meta || !item) {
    notFound();
  }

  const profile =
    context === "brand"
      ? access.brandProfile && {
          id: access.brandProfile.id,
          values: brandProfileToFormValues(access.brandProfile),
        }
      : access.artistProfile && {
          id: access.artistProfile.id,
          values: artistProfileToFormValues(access.artistProfile),
        };

  if (!profile) {
    notFound();
  }

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

      <ProfileForm
        context={context}
        contextLabel={meta.label}
        profileId={profile.id}
        values={profile.values}
      />
    </Container>
  );
}