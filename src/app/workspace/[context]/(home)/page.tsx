import { CheckCheck, Disc3, FileText, FolderOpen, Images, Megaphone } from "lucide-react";
import Link from "next/link";
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
import { countOutputs } from "@/domains/outputs/data";
import { countArtistOutputs } from "@/domains/releases/data";
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
  // Real "ready to open" counts for the materials links (Checkpoint 2.5).
  // The Artist context has no such areas yet, so nothing is queried for it.
  const materials = brand ? await countOutputs(access, context) : null;
  // Real "ready to open" counts for the Artist releases/assets links
  // (Checkpoint 2.6). Brand has its own materials section, so nothing extra
  // is queried for it.
  const artistOutputs = brand ? null : await countArtistOutputs(access, context);

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
      {materials ? (
        <DashboardSection
          labelledBy="your-materials"
          eyebrow="Ready for you"
          title="Documents & marketing"
          description="Business, brand and marketing creative we have created for you. The counts are what you can open right now."
        >
          <DashboardList>
            <li>
              <Link
                href={`/workspace/${context}/documents`}
                className="group flex min-h-11 flex-col gap-2 rounded-sm py-5 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/35 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <FileText aria-hidden className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-heading font-semibold text-foreground transition-colors group-hover:text-primary">
                      My Documents
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      Guidelines, profiles, presentations and letterheads
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {materials.documents === 0
                    ? "None yet"
                    : `${materials.documents} available`}
                </span>
              </Link>
            </li>
            <li>
              <Link
                href={`/workspace/${context}/marketing`}
                className="group flex min-h-11 flex-col gap-2 rounded-sm py-5 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/35 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Megaphone aria-hidden className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-heading font-semibold text-foreground transition-colors group-hover:text-primary">
                      My Marketing
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      Social kits, promotional creative and content packs
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {materials.marketing === 0
                    ? "None yet"
                    : `${materials.marketing} available`}
                </span>
              </Link>
            </li>
          </DashboardList>
        </DashboardSection>
      ) : null}
      <DashboardSection labelledBy="active-work" eyebrow="Moving forward" title="What is being worked on?" description="Your most recently updated projects and requests. Up to six of each are shown.">
        {data.projects.length || data.requests.length ? <DashboardList>
          {data.projects.map((item) => (
            <li key={item.id}>
              {/* Link to the customer project detail (Checkpoint 2.4). */}
              <Link href={`/workspace/${context}/projects/${item.id}`} className="group flex min-h-11 flex-col gap-1 rounded-sm py-5 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/35">
                <p className="text-meta text-muted-foreground">Your project</p>
                <h3 className="text-heading font-semibold transition-colors group-hover:text-primary">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{projectStatusLabels[item.status]}</p>
              </Link>
            </li>
          ))}
          {data.requests.map((item) => <li key={item.id} className="py-5"><p className="text-meta text-muted-foreground">Your request</p><h3 className="text-heading font-semibold">{item.name}</h3><p className="mt-1 text-sm text-muted-foreground">{requestStatusLabels[item.status]}</p></li>)}
        </DashboardList> : <DashboardSectionEmpty icon={FolderOpen} title="No active work yet" description="Once your first request is underway, its progress will appear here." />}
      </DashboardSection>
      <DashboardSection labelledBy="quick-requests" eyebrow="What comes next" title="What can I request?" description="Explore what we can make together, then start a request whenever you are ready.">
        <DashboardQuickRequests requests={quickRequestsFor(context)} label={`${label} quick requests`} />
      </DashboardSection>
      {/* Artist releases/assets links with real counts (Checkpoint 2.6).
          Additive section only; everything above is untouched. */}
      {artistOutputs ? (
        <DashboardSection labelledBy="release-library" eyebrow="Your catalog" title="Releases & assets" description="What you have released, and the artwork and files behind it.">
          <DashboardList>
            <li>
              <Link href={`/workspace/${context}/releases`} className="group flex min-h-11 flex-col gap-2 rounded-sm py-5 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/35 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <span className="flex min-w-0 items-center gap-3">
                  <Disc3 aria-hidden className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-heading font-semibold text-foreground transition-colors group-hover:text-primary">My Releases</span>
                    <span className="block text-sm text-muted-foreground">Singles, EPs and albums we have created for you</span>
                  </span>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {artistOutputs.releases === 0 ? "None yet" : `${artistOutputs.releases} available`}
                </span>
              </Link>
            </li>
            <li>
              <Link href={`/workspace/${context}/assets`} className="group flex min-h-11 flex-col gap-2 rounded-sm py-5 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/35 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <span className="flex min-w-0 items-center gap-3">
                  <Images aria-hidden className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-heading font-semibold text-foreground transition-colors group-hover:text-primary">My Assets</span>
                    <span className="block text-sm text-muted-foreground">Cover artwork, social graphics and creative files</span>
                  </span>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {artistOutputs.assets === 0 ? "None yet" : `${artistOutputs.assets} available`}
                </span>
              </Link>
            </li>
          </DashboardList>
        </DashboardSection>
      ) : null}
    </Container>
  );
}
