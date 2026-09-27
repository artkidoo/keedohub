/**
 * Production server actions (Phase 3.1).
 *
 * Every action is a server entry point, so every one of them re-authorises from
 * scratch (spec §19.4): `requireOperator` resolves the session and the live
 * operator record, and a customer who is not staff gets the same 404 as a URL
 * that does not exist, so production routes are not discoverable.
 *
 * Nothing here trusts the form. A job id, a deliverable id, an operator id and
 * an uploaded file are the only values read from the caller, and each is
 * resolved against server-side records before anything is written. A status, a
 * next state or a workspace is never taken from submitted data: the lifecycle
 * decides which moves are legal.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOperator } from "./access";
import {
  assignProductionJob,
  createProductionJobForProject,
  createProjectFromRequest,
  transitionJob,
} from "./chain";
import { deliverApprovedWork } from "./delivery";
import { deliveryRefusalLabels } from "./delivery-state";
import { ProductionError } from "./errors";
import { isJobStatus } from "./lifecycle";
import { createDeliverableForJob, produceVersion, updateDeliverable } from "./output";
import { failedProductionState, type ProductionState } from "./state";
import { isValidUUIDv4 } from "@/lib/validation/id";
import type { JobStatus } from "@/lib/db/schema";

/** Where the private production surfaces live. */
const QUEUE_PATH = "/studio/production";

const jobPath = (jobId: string) => `${QUEUE_PATH}/${jobId}`;

/** Refresh the whole private production tree after a change. */
function refreshProduction(jobId?: string): void {
  revalidatePath(QUEUE_PATH, "layout");
  if (jobId) revalidatePath(jobPath(jobId));
}

/** A submitted job state, validated against the real enum before any work. */
function parseJobStatus(value: FormDataEntryValue | null): JobStatus | null {
  return typeof value === "string" && isJobStatus(value) ? value : null;
}

/** Assign (or unassign) a job to an operator. */
export async function assignJobAction(
    _previous: ProductionState,
  formData: FormData,
): Promise<ProductionState> {
  const access = await requireOperator();
  const jobId = formData.get("jobId");
  const operatorId = formData.get("operatorId");

  if (typeof jobId !== "string" || !isValidUUIDv4(jobId)) {
    return failedProductionState();
  }

  try {
    await assignProductionJob(
      access,
      jobId,
      typeof operatorId === "string" && operatorId ? operatorId : null,
    );
  } catch (error) {
    console.error("Assignment failed:", error);
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "The assignment was not saved.",
      fieldErrors: {},
    };
  }

  refreshProduction(jobId);
  return { status: "idle", message: null, fieldErrors: {} };
}

/**
 * Move a job along the lifecycle.
 *
 * The requested state is checked against the real enum before it reaches the
 * state machine, and the state machine itself refuses anything the lifecycle
 * does not allow — including the jump to customer review that internal QA has
 * not cleared.
 */
export async function transitionJobAction(
    _previous: ProductionState,
  formData: FormData,
): Promise<ProductionState> {
  const access = await requireOperator();
  const jobId = formData.get("jobId");
  const next = parseJobStatus(formData.get("next"));

  if (typeof jobId !== "string" || !isValidUUIDv4(jobId) || !next) {
    return failedProductionState();
  }

  try {
    await transitionJob(access, jobId, next);
  } catch (error) {
    console.error("Transition refused:", error);
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "That move is not available right now.",
      fieldErrors: {},
    };
  }

  refreshProduction(jobId);
  return { status: "idle", message: null, fieldErrors: {} };
}

/** Create a deliverable (the piece of work being produced) on a job. */
export async function createDeliverableAction(
    _previous: ProductionState,
  formData: FormData,
): Promise<ProductionState> {
  const access = await requireOperator();
  const jobId = formData.get("jobId");
  const name = formData.get("name");
  const type = formData.get("type");

  if (typeof jobId !== "string" || !isValidUUIDv4(jobId)) {
    return failedProductionState();
  }

  try {
    await createDeliverableForJob(access, jobId, {
      name: typeof name === "string" ? name : "",
      type: typeof type === "string" ? type : "",
    });
  } catch (error) {
    console.error("Deliverable could not be created:", error);
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "The deliverable was not created.",
      fieldErrors: {},
    };
  }

  refreshProduction(jobId);
  return { status: "idle", message: null, fieldErrors: {} };
}

/** Rename or re-type an existing deliverable. */
export async function updateDeliverableAction(
    _previous: ProductionState,
  formData: FormData,
): Promise<ProductionState> {
  const access = await requireOperator();
  const deliverableId = formData.get("deliverableId");
  const name = formData.get("name");
  const type = formData.get("type");

  if (typeof deliverableId !== "string" || !isValidUUIDv4(deliverableId)) {
    return failedProductionState();
  }

  try {
    await updateDeliverable(access, deliverableId, {
      name: typeof name === "string" ? name : undefined,
      type: typeof type === "string" ? type : undefined,
    });
  } catch (error) {
    console.error("Deliverable could not be updated:", error);
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "The change was not saved.",
      fieldErrors: {},
    };
  }

  refreshProduction();
  return { status: "idle", message: null, fieldErrors: {} };
}

/**
 * Produce a new version of a deliverable from an uploaded file.
 *
 * The file is the work; the note says what changed in it. The previous version
 * is preserved and becomes superseded, never overwritten (spec §11.3).
 */
export async function produceVersionAction(
    _previous: ProductionState,
  formData: FormData,
): Promise<ProductionState> {
  const access = await requireOperator();
  const deliverableId = formData.get("deliverableId");
  const file = formData.get("file");
  const note = formData.get("note");
  const share = formData.get("shareWithCustomer");

  if (typeof deliverableId !== "string" || !isValidUUIDv4(deliverableId)) {
    return failedProductionState();
  }

  if (!(file instanceof File) || file.size === 0) {
    return {
      status: "error",
      message: "Choose the file for this version before saving.",
      fieldErrors: {},
    };
  }

  try {
    await produceVersion(access, deliverableId, {
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        bytes: Buffer.from(await file.arrayBuffer()),
      },
      note: typeof note === "string" ? note : null,
      shareWithCustomer: share === "on" || share === "true",
    });
  } catch (error) {
    console.error("Version could not be produced:", error);
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "The version was not created.",
      fieldErrors: {},
    };
  }

  refreshProduction();
  return { status: "idle", message: null, fieldErrors: {} };
}

/**
 * Deliver approved work to the customer (Phase 3.2).
 *
 * Delivery is an operator action and nothing else. The customer can approve
 * work, but approval is not delivery: the customer never triggers this, and a
 * form replayed by a customer changes nothing because `requireOperator` runs
 * first (spec §14.2 rule 1, §19.4).
 *
 * A repeat is not an error: the delivery function returns the existing delivery,
 * so a double-clicked button cannot create a second record or a second customer
 * notification.
 */
export async function deliverWorkAction(
  _previous: ProductionState,
  formData: FormData,
): Promise<ProductionState> {
  const access = await requireOperator();
  const deliverableId = formData.get("deliverableId");

  if (typeof deliverableId !== "string" || !isValidUUIDv4(deliverableId)) {
    return failedProductionState();
  }

  try {
    await deliverApprovedWork(access, deliverableId);
  } catch (error) {
    console.error("Delivery refused:", error);
    return {
      status: "error",
      message:
        error instanceof ProductionError
          ? deliveryRefusalMessage(error.message)
          : "The work could not be delivered. Nothing was changed.",
      fieldErrors: {},
    };
  }

  refreshProduction();
  return { status: "idle", message: null, fieldErrors: {} };
}

/** Turn an internal refusal into a sentence an operator can act on. */
function deliveryRefusalMessage(message: string): string {
  const reason = message.split(": ").pop() ?? message;
  const label = (deliveryRefusalLabels as Record<string, string>)[reason];
  return label ? `This work cannot be delivered: ${label}` : message;
}

/**
 * Accept a customer request and open production for it.
 *
 * This is the start of the chain the specification describes: request → project
 * → production job. Everything about the project and the job is inherited from
 * the request the operator named, so it cannot be grafted onto another
 * customer's work, and creating it twice returns the same project rather than
 * forking the chain.
 */
export async function startWorkFromRequestAction(
  formData: FormData,
): Promise<void> {
  const access = await requireOperator();
  const requestId = formData.get("requestId");

  if (typeof requestId !== "string" || !isValidUUIDv4(requestId)) {
    return;
  }

  const project = await createProjectFromRequest(access, requestId);
  const job = await createProductionJobForProject(access, project.id);

  refreshProduction(job.id);
  redirect(jobPath(job.id));
}
