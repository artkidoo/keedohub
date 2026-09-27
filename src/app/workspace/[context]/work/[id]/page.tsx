import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getWork, listWorkFiles } from "@/domains/dashboard/queries";
import { deliverableStatusLabels } from "@/domains/production/status";
import { getReviewableWork } from "@/domains/review/data";
import { deliveredCopy } from "@/domains/review/presentation";
import { ReviewPanel } from "@/domains/review/review-panel";
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

/**
 * One piece of the customer's work, and their decision on it.
 *
 * Read-only companion to the dashboard, now with the review surface: the version
 * being looked at, its project and request context, the files shared with them,
 * and their two options — approve, or ask for changes (spec §13).
 */
export default async function WorkPage({ params }: {
  params: Promise<{ context: string; id: string }>;
}) {
  const { context, id } = await params;
  if (!isWorkspaceContext(context) || !isValidUUIDv4(id)) notFound();
  const access = await requireWorkspaceContext(context, `/workspace/${context}/work/${id}`);
  const work = await getWork(access, context, id);
  if (!work) notFound();

  // Both reads are scoped to the same verified access; a foreign or
  // non-customer-visible work item simply resolves to null and 404s, exactly
  // like a missing one.
  const [files, reviewable] = await Promise.all([
    listWorkFiles(access, context, id),
    getReviewableWork(access, context, id),
  ]);
  if (!reviewable) notFound();

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        title={work.name}
        eyebrow={work.projectName}
        description={`Version ${work.version} · ${deliverableStatusLabels[work.status]}`}
      />
      <Link
        href={`/workspace/${context}`}
        className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
      >
        Back to dashboard
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <ReviewPanel work={reviewable} context={context} />

        <section aria-labelledby="work-files" className="flex min-w-0 flex-col gap-5">
          <h2 id="work-files" className="text-section">
            {reviewable.delivery
              ? deliveredCopy.filesHeading
              : "Files shared with you"}
          </h2>
          {files.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {files.map((file) => (
                <li key={file.id} className="py-4">
                  <a
                    href={`/workspace/${context}/work/${id}/files/${file.id}`}
                    className="inline-flex min-h-11 max-w-full items-center break-all text-primary underline underline-offset-4"
                  >
                    {`Download ${file.filename}`}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No files shared yet"
              description="This work is recorded, but no customer-visible files are available for this version yet."
            />
          )}
        </section>
      </div>
    </Container>
  );
}
