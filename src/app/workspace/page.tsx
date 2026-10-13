import { redirect } from "next/navigation";

import { requireWorkspace } from "@/domains/workspace/access";
import { accountTypeOf, defaultContextFor } from "@/lib/account-type";
import { WORKSPACE_ROOT } from "@/lib/navigation";

/**
 * Entry point of the unified customer workspace.
 *
 * The destination is decided server-side from the workspace row: an account
 * that chose "artist" at sign-up enters Artist OS, a "brand" account (or a
 * legacy account with no type on record) enters Brand OS. Nothing in the
 * URL, a query parameter or client state can influence the choice — the
 * session resolves the user, the user resolves the owned workspace, and the
 * workspace carries the type.
 */
export default async function WorkspaceIndexPage() {
  const access = await requireWorkspace(WORKSPACE_ROOT);
  redirect(`${WORKSPACE_ROOT}/${defaultContextFor(accountTypeOf(access.workspace))}`);
}
