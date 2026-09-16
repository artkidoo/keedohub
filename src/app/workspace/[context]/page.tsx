import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";
import { ActivityFeed } from "@/components/workspace/activity-feed";
import { CreativePreviewShelf } from "@/components/workspace/creative-preview-shelf";
import { ProfileCompletion } from "@/components/workspace/profile-completion";
import { QuickActions } from "@/components/workspace/quick-actions";
import { WhatsHappening } from "@/components/workspace/whats-happening";
import { WorkspaceWelcome } from "@/components/workspace/workspace-welcome";
import {
  getContextMeta,
  isWorkspaceContext,
} from "@/lib/navigation";
import { workspaceHome } from "@/lib/workspace";

type ContextPageProps = {
  params: Promise<{ context: string }>;
};

export async function generateMetadata({ params }: ContextPageProps) {
  const { context } = await params;
  const meta = isWorkspaceContext(context) ? getContextMeta(context) : undefined;
  return { title: `${meta?.label ?? "Workspace"} workspace` };
}

/**
 * The unified workspace home. Brand and Artist share this one composition —
 * only the content changes with the context (spec §5). Every section is
 * honest about what does not exist yet: no fabricated projects, activity or
 * files, because there is no backend (spec §14).
 */
export default async function WorkspaceContextPage({
  params,
}: ContextPageProps) {
  const { context } = await params;

  if (!isWorkspaceContext(context)) {
    notFound();
  }

  const meta = getContextMeta(context);
  const home = workspaceHome[context];
  const label = meta?.label ?? "Workspace";

  return (
    <Container className="flex flex-col gap-10 py-8 sm:gap-14 sm:py-12">
      <PageHeader
        title={`${label} workspace`}
        description={home.description}
      />

      <WorkspaceWelcome
        eyebrow={home.eyebrow}
        name={home.name}
        description={home.description}
        initials={home.initials}
        statusLabel={home.statusLabel}
      />

      <Section spacing="none" aria-labelledby="happening">
        <SectionHeader
          id="happening"
          eyebrow="Right now"
          title="What is happening in your workspace"
          description={home.introCopy}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <WhatsHappening
            icon="folder"
            title="Work in progress"
            copy="Projects KeedoHub is producing for you."
            stateLabel="None"
            stateCopy="No projects are in production yet."
          />
          <WhatsHappening
            icon="check"
            title="Needs your review"
            copy="Finished work waiting on your approval."
            stateLabel="Clear"
            stateCopy="Nothing needs your review right now."
          />
        </div>
      </Section>

      <Section spacing="none" aria-labelledby="recent-work">
        <SectionHeader
          id="recent-work"
          eyebrow="Recent creative work"
          title={home.introTitle}
          description="Work KeedoHub has finished for you appears here as visual previews — documents, artwork and assets, each one ready to use."
        />
        <div className="mt-8">
          <CreativePreviewShelf
            previews={home.previews}
            emptyTitle="Your creative library will appear here"
            emptyCopy="as KeedoHub delivers work. These are the shelf slots it will fill — nothing has been produced for this workspace yet."
          />
        </div>
      </Section>

      <Section spacing="none" aria-labelledby="quick-actions">
        <SectionHeader
          id="quick-actions"
          eyebrow="Quick actions"
          title="What would you like to do?"
        />
        <div className="mt-8">
          <QuickActions actions={home.actions} label={`${label} quick actions`} />
        </div>
      </Section>

      <Section spacing="none" aria-labelledby="profile">
        <SectionHeader
          id="profile"
          eyebrow="Profile"
          title={home.profileTitle}
          description={home.profileCopy}
        />
        <div className="mt-8">
          <ProfileCompletion
            title={home.profileTitle}
            description={home.profileCopy}
            groups={home.groups}
            actionLabel={home.profileActionLabel}
            actionHref={home.profileHref}
          />
        </div>
      </Section>

      <Section spacing="none" divided className="pt-10 sm:pt-14">
        <SectionHeader
          eyebrow="Recent activity"
          title="Your workspace, in order"
          description="Requests, production updates, reviews and deliveries appear here as they happen."
        />
        <div className="mt-8">
          <ActivityFeed items={home.activity} />
        </div>
      </Section>
    </Container>
  );
}