import { CheckCheck, FolderOpen, Images } from "lucide-react";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileStatusStrip } from "@/components/dashboard/profile-strip";
import { DashboardQuickRequests } from "@/components/dashboard/quick-requests";
import { DashboardList, DashboardSection, DashboardSectionEmpty } from "@/components/dashboard/section";
import { WorkList } from "@/components/dashboard/work-list";
import { getDashboardData } from "@/domains/dashboard/queries";
import { profileStatusFor } from "@/domains/dashboard/profile-status";
import { quickRequestsFor } from "@/domains/dashboard/quick-requests";
import { projectStatusLabels, requestStatusLabels } from "@/domains/production/status";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import { isWorkspaceContext } from "@/lib/navigation";

type ContextPageProps = { params: Promise<{ context: string }> };

export async function generateMetadata({ params }: ContextPageProps) {
  const { context } = await params;
  return { title: context === "brand" ? "Brand workspace" : "Artist workspace" };
}

/** Both experiences use this server-rendered dashboard and the existing shell. */
export default async function WorkspaceContextPage({ params }: ContextPageProps) {
  const { context } = await params;
  if (!isWorkspaceContext(context)) notFound();
  const access = await requireWorkspaceContext(context, `/workspace/${context}`);
  const status = profileStatusFor(context, access.brandProfile, access.artistProfile);
  if (!status) notFound();
  const data = await getDashboardData(access, context);
  const brand = context === "brand";
  const label = brand ? "Brand" : "Artist";

  return (
    <Container className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] sm:gap-14 sm:py-12">
      <PageHeader
        eyebrow={`${label} workspace`}
        title={status.displayName ? `Welcome back, ${status.displayName}` : brand ? "Your brand, in good company" : "Your music. Your next chapter."}
        description={brand ? "Your creative work, what is moving forward, and where your input matters." : "Your artwork and creative work, from first ideas to ready-to-share pieces."}
      />
      <ProfileStatusStrip contextLabel={label} status={status} profileHref={`/workspace/${context}/profile`} profileActionLabel="Edit profile" />
      <DashboardSection labelledBy="review" eyebrow="Your next step" title="Needs your review" description="Open the latest version and take a closer look.">
        {data.needsReview.length ? <WorkList items={data.needsReview} context={context} /> : <DashboardSectionEmpty icon={CheckCheck} title="Nothing needs your review right now" description="When work is ready for your input, it will appear here." />}
      </DashboardSection>
      <DashboardSection labelledBy="creative-work" eyebrow="Made for you" title={brand ? "Recent creative work" : "Recent artwork & creative work"} description="Your latest approved and delivered pieces. Up to six recent items are shown.">
        {data.created.length ? <WorkList items={data.created} context={context} /> : <DashboardSectionEmpty icon={Images} title={brand ? "Your creative library starts here" : "A place for your next creative chapter"} description={brand ? "As your work is approved and delivered, you will find it here. No finished work yet." : "Approved artwork and release assets will appear here when they exist. No finished work yet."} action={{ label: "Shape your profile", href: `/workspace/${context}/profile` }} />}
      </DashboardSection>
      <DashboardSection labelledBy="active-work" eyebrow="Moving forward" title="What is being worked on?" description="Your most recently updated projects and requests. Up to six of each are shown.">
        {data.projects.length || data.requests.length ? <DashboardList>
          {data.projects.map((item) => <li key={item.id} className="py-5"><p className="text-meta text-muted-foreground">Your project</p><h3 className="text-heading font-semibold">{item.name}</h3><p className="mt-1 text-sm text-muted-foreground">{item.status === "in_review" ? "Waiting for your review" : projectStatusLabels[item.status]}</p></li>)}
          {data.requests.map((item) => <li key={item.id} className="py-5"><p className="text-meta text-muted-foreground">Your request</p><h3 className="text-heading font-semibold">{item.name}</h3><p className="mt-1 text-sm text-muted-foreground">{requestStatusLabels[item.status]}</p></li>)}
        </DashboardList> : <DashboardSectionEmpty icon={FolderOpen} title="No active work yet" description="Once your first request is underway, its progress will appear here." />}
      </DashboardSection>
      <DashboardSection labelledBy="quick-requests" eyebrow="What comes next" title="What can I request?" description="Explore what we can make together, then start a request whenever you are ready.">
        <DashboardQuickRequests requests={quickRequestsFor(context)} label={`${label} quick requests`} />
      </DashboardSection>
    </Container>
  );
}
