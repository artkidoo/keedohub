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

import { recordNotification } from "@/domains/notifications/data";
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

  // A real customer-facing event has now happened, so it can honestly appear in
  // Notifications (Checkpoint 2.8). This is the one event that already exists in
  // the architecture without any Phase 3 workflow infrastructure: the customer
  // submitted the request themselves. Review/approval/delivery events are
  // recorded by the Studio transitions when those arrive — none are faked here.
  // `recordNotification` resolves the user and workspace from the session again
  // and never throws, so a notification can never lose or fail the request.
  await recordNotification(context, {
    type: "request_received",
    title: "Request received",
    message: `We have your request “${created.title}”. We will take a look and keep you updated here.`,
    href: `/requests/${created.id}`,
  });

  // Fresh data everywhere the new request shows up: its list and the
  // dashboard active-work section. redirect() throws, so it stays outside
  // the try/catch above (spec §7, Next.js redirect behaviour).
  revalidatePath(listPath);
  revalidatePath(`/workspace/${context}`);
  revalidatePath(`/workspace/${context}/notifications`);
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
