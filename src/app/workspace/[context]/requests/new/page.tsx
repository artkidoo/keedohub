import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { RequestForm } from "@/domains/requests/request-form";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  getContextMeta,
  isWorkspaceContext,
} from "@/lib/navigation";

type NewRequestPageProps = {
  params: Promise<{ context: string }>;
};

export async function generateMetadata({ params }: NewRequestPageProps) {
  const { context } = await params;
  if (!isWorkspaceContext(context)) {
    notFound();
  }
  return { title: "Start a request" };
}

/**
 * Start a request in one context of the caller's workspace.
 *
 * The server action re-authorises on submit and never reads a workspace,
 * profile or context field from the form — the context is a hardcoded
 * argument of the action itself (spec §19.4).
 */
export default async function NewRequestPage({ params }: NewRequestPageProps) {
  const { context } = await params;

  if (!isWorkspaceContext(context)) {
    notFound();
  }

  const listPath = `/workspace/${context}/requests`;
  await requireWorkspaceContext(context, `${listPath}/new`);

  const meta = getContextMeta(context);
  const item = findNavItemBySlug(context, "requests");

  if (!meta || !item) {
    notFound();
  }

  return (
    <Container className="flex flex-col gap-8 py-8 sm:gap-10 sm:py-12">
      <PageHeader
        breadcrumb={[
          { label: `${meta.label} workspace`, href: meta.href },
          { label: item.label, href: listPath },
          { label: "New request" },
        ]}
        title="Start a request"
        description="Tell us the outcome you are after. KeedoHub reviews every request before any work begins — you will see its state under My Requests."
      />
      <RequestForm context={context} contextLabel={meta.label} />
    </Container>
  );
}