import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getWork, listWorkFiles } from "@/domains/dashboard/queries";
import { deliverableStatusLabels } from "@/domains/production/status";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import { isWorkspaceContext } from "@/lib/navigation";
import { isValidUUIDv4 } from "@/lib/validation/id";

/**
 * Authorization runs here, before the streamed shell: with a `loading.tsx`
 * boundary upstream the page body streams a 200, so the hard 404 for
 * another customer's (or a missing) work id must be decided here.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ context: string; id: string }>;
}) {
  const { context, id } = await params;
  if (isWorkspaceContext(context) && isValidUUIDv4(id)) {
    const access = await requireWorkspaceContext(context);
    const work = await getWork(access, context, id);
    if (work) {
      return { title: work.name };
    }
  }
  notFound();
}

/** Read-only companion to the dashboard; approval submission is not built here. */
export default async function WorkPage({ params }: {
  params: Promise<{ context: string; id: string }>;
}) {
  const { context, id } = await params;
  if (!isWorkspaceContext(context) || !isValidUUIDv4(id)) notFound();
  const access = await requireWorkspaceContext(context, `/workspace/${context}/work/${id}`);
  const work = await getWork(access, context, id);
  if (!work) notFound();
  const files = await listWorkFiles(access, context, id);

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader title={work.name} eyebrow={work.projectName}
        description={`Version ${work.version} · ${deliverableStatusLabels[work.status]}`} />
      <Link href={`/workspace/${context}`} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">Back to dashboard</Link>
      {work.status === "customer_review" ? <p className="max-w-prose text-base text-muted-foreground">Open the files below to look over this version. Approval and feedback submission are not available here yet.</p> : null}
      <section aria-labelledby="work-files" className="flex min-w-0 flex-col gap-5">
        <h2 id="work-files" className="text-section">Files shared with you</h2>
        {files.length ? <ul className="divide-y divide-border border-y border-border">
          {files.map((file) => <li key={file.id} className="py-4">
            <a href={`/workspace/${context}/work/${id}/files/${file.id}`} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">Download {file.filename}</a>
          </li>)}
        </ul> : <EmptyState title="No files shared yet" description="This work is recorded, but no customer-visible files are available for this version yet." />}
      </section>
    </Container>
  );
}
