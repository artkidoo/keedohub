import { redirect } from "next/navigation";

import { defaultWorkspaceContext, WORKSPACE_ROOT } from "@/lib/navigation";

/**
 * Entry point of the unified customer workspace.
 *
 * There is no authentication yet, so no customer context can be known: the
 * workspace opens on the default context. When authentication arrives this
 * becomes the real entry point (the customer's workspace home).
 */
export default function WorkspaceIndexPage() {
  redirect(`${WORKSPACE_ROOT}/${defaultWorkspaceContext}`);
}
