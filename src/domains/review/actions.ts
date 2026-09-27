/**
 * Customer review server actions (Phase 3.1).
 *
 * Each action is a server entry point, so each one re-authorises from scratch
 * (spec §19.4): the session is resolved server-side, the caller's owned
 * workspace and requested context profile are loaded from the database, and the
 * decision is bound to the work the caller is proven to own.
 *
 * The context is a hardcoded argument of the calling action — never read from
 * submitted data — and the decision itself is one of two literal values chosen
 * by the server from which button was used. There is no "set the status to X"
 * field anywhere: a form cannot ask for a state the state machine refuses.
 */

"use server";

import { revalidatePath } from "next/cache";

import { decideReview } from "@/domains/review/data";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import { isValidUUIDv4 } from "@/lib/validation/id";
import type { WorkspaceContext } from "@/lib/navigation";
import { failedReviewState, type ReviewFormState } from "./state";

/**
 * The customer's decision on one version of their work.
 *
 * `formData` supplies only the decision's own words (the feedback). Everything
 * that identifies the work — the deliverable, the workspace, the context, the
 * version — is resolved server-side from the caller's own session and records.
 */
export async function submitReview(
  context: WorkspaceContext,
  workId: string,
  choice: "approve" | "request_changes",
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const workPath = `/workspace/${context}/work/${workId}`;
  const access = await requireWorkspaceContext(context, workPath);

  if (!isValidUUIDv4(workId)) {
    return failedReviewState();
  }

  const feedback = formData.get("feedback");
  const decision = {
    decision: choice,
    feedback: typeof feedback === "string" ? feedback : null,
  };

  try {
    const { status } = await decideReview(access, context, workId, decision);

    // Fresh data everywhere the decision shows up: the work itself, the
    // dashboard and the notifications list.
    revalidatePath(workPath);
    revalidatePath(`/workspace/${context}`);
    revalidatePath(`/workspace/${context}/notifications`);

    return {
      status: "idle",
      message: null,
      fieldErrors: {},
      outcome: { status, href: workPath },
    };
  } catch (error) {
    console.error("Review could not be recorded:", error);
    return failedReviewState();
  }
}