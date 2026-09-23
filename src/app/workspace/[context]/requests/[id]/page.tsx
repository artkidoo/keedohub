import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { TextLink } from "@/components/ui/link";
import { getRequest, toStringArray } from "@/domains/requests/data";
import {
  formatRequestDate,
  requestStatusBadgeVariants,
} from "@/domains/requests/presentation";
import { requestCategoryLabel } from "@/domains/requests/categories";
import { requestStatusLabels } from "@/domains/production/status";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  getContextMeta,
  isWorkspaceContext,
} from "@/lib/navigation";
import { isValidUUIDv4 } from "@/lib/validation/id";
import { cn } from "@/lib/utils";

type RequestDetailPageProps = {
  params: Promise<{ context: string; id: string }>;
};

/**
 * Authorization runs here, before anything streams: the hard 404 for another
 * customer's (or a missing) request id is decided in `generateMetadata`, the
 * last point where the response status can still be set (spec §19.5 —
 * existence is never revealed). There is deliberately no `loading.tsx` at or
 * above this route: a boundary that streamed a shell first would commit a 200
 * and weaken the 404 to a client-side swap (the read is one fast query).
 */
export async function generateMetadata({ params }: RequestDetailPageProps) {
  const { context, id } = await params;
  if (isWorkspaceContext(context) && isValidUUIDv4(id)) {
    const access = await requireWorkspaceContext(context);
    const entry = await getRequest(access, context, id);
    if (entry) {
      return { title: entry.title };
    }
  }
  notFound();
}

/** One request, in the customer's words, with its state and any reason given. */
export default async function RequestDetailPage({
  params,
}: RequestDetailPageProps) {
  const { context, id } = await params;

  if (!isWorkspaceContext(context) || !isValidUUIDv4(id)) {
    notFound();
  }

  const listPath = `/workspace/${context}/requests`;
  const access = await requireWorkspaceContext(context, `${listPath}/${id}`);
  const entry = await getRequest(access, context, id);

  if (!entry) {
    notFound();
  }

  const meta = getContextMeta(context);
  const item = findNavItemBySlug(context, "requests");

  if (!meta || !item) {
    notFound();
  }

  const requirements = toStringArray(entry.requirements);
  const referenceLinks = toStringArray(entry.referenceLinks);
  const statusLabel = requestStatusLabels[entry.status];

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:gap-10 sm:py-12">
      <PageHeader
        breadcrumb={[
          { label: `${meta.label} workspace`, href: meta.href },
          { label: item.label, href: listPath },
          { label: entry.title },
        ]}
        eyebrow={requestCategoryLabel(context, entry.category)}
        title={entry.title}
        description={`Sent on ${formatRequestDate(entry.createdAt)}.`}
        actions={
          <Badge variant={requestStatusBadgeVariants[entry.status]}>
            {statusLabel}
          </Badge>
        }
      />

      <Link
        href={listPath}
        className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
      >
        Back to My Requests
      </Link>

      {entry.statusReason ? (
        <p
          role="status"
          className={cn(
            "max-w-prose rounded-xl border px-4 py-3 text-sm",
            entry.status === "declined"
              ? "border-danger/25 bg-danger/5 text-danger"
              : "border-warning/30 bg-warning/10 text-warning-foreground",
          )}
        >
          {entry.statusReason}
        </p>
      ) : null}

      <section
        aria-labelledby="request-description"
        className="flex min-w-0 flex-col gap-4"
      >
        <h2 id="request-description" className="text-section">
          What you asked for
        </h2>
        <p className="max-w-prose whitespace-pre-line text-base leading-relaxed text-muted-foreground">
          {entry.description}
        </p>
      </section>

      {requirements.length ? (
        <section
          aria-labelledby="request-requirements"
          className="flex min-w-0 flex-col gap-4"
        >
          <h2 id="request-requirements" className="text-section">
            Requirements
          </h2>
          <ul className="flex flex-col gap-2.5">
            {requirements.map((line, index) => (
              <li
                key={`${index}-${line}`}
                className="flex gap-3 text-base text-muted-foreground"
              >
                <span
                  aria-hidden
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                />
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {referenceLinks.length ? (
        <section
          aria-labelledby="request-references"
          className="flex min-w-0 flex-col gap-4"
        >
          <h2 id="request-references" className="text-section">
            Reference links
          </h2>
          <ul className="flex flex-col gap-2.5">
            {referenceLinks.map((href) => (
              <li key={href} className="min-w-0">
                <TextLink external href={href} underline className="max-w-full break-all">
                  {href}
                </TextLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}