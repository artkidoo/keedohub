/**
 * Request server actions.
 *
 * Each action is a server entry point, so each one re-authorises from scratch
 * (spec §19.4): the session is resolved server-side, the caller's owned
 * workspace and the requested context profile are loaded from the database,
 * and the write is bound to those server-resolved ids. The client cannot
 * name a workspace, a profile or the other context — extra form fields are
 * never read.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspaceContext } from "@/domains/workspace/access";
import type { WorkspaceContext } from "@/lib/navigation";
import { createRequestForContext } from "./data";
import {
  failedRequestState,
  invalidRequestState,
  type RequestFormState,
} from "./state";
import { parseRequestForm } from "./validation";

/**
 * Shared body of both create actions. The context is a hardcoded argument of
 * the calling action — never taken from submitted data — so a form cannot
 * switch contexts by manipulating a field.
 */
async function submitRequest(
  context: WorkspaceContext,
  formData: FormData,
): Promise<RequestFormState> {
  const listPath = `/workspace/${context}/requests`;
  const access = await requireWorkspaceContext(context, `${listPath}/new`);
  const parsed = parseRequestForm(context, formData);

  if (!parsed.ok) {
    return invalidRequestState(parsed.fieldErrors, parsed.raw);
  }

  let created: Awaited<ReturnType<typeof createRequestForContext>>;

  try {
    created = await createRequestForContext(access, context, parsed.values);
  } catch (error) {
    console.error("Request creation failed:", error);
    return failedRequestState(parsed.raw);
  }

  if (!created) {
    return failedRequestState(parsed.raw);
  }

  // Fresh data everywhere the new request shows up: its list and the
  // dashboard active-work section. redirect() throws, so it stays outside
  // the try/catch above (spec §7, Next.js redirect behaviour).
  revalidatePath(listPath);
  revalidatePath(`/workspace/${context}`);
  redirect(`${listPath}/${created.id}`);
}

/** Send a Brand request from the caller's Brand context. */
export async function createBrandRequest(
  _previous: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  return submitRequest("brand", formData);
}

/** Send an Artist request from the caller's Artist context. */
export async function createArtistRequest(
  _previous: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  return submitRequest("artist", formData);
}
