/**
 * Creative production server actions (Phase 4.3, spec §8, §9, §16, §23).
 *
 * Two writes exist here and both are deliberately small: saving the operator's
 * production instructions, and ticking one production-checklist item. Neither
 * moves the job's state — the lifecycle remains the only owner of production
 * state (spec §16), and these actions never name a status.
 *
 * Every action re-authorises from scratch: `requireOperator` resolves the
 * session and a live operator record, so a customer replaying a form changes
 * nothing. The submitted job id is validated as a UUID before it reaches the
 * database, every instruction value is re-validated by the Zod schema in
 * brief.ts (which refuses unknown keys outright), and a checklist key is checked
 * against the job's real template inside the store. Nothing about production
 * state is taken from the form (spec §23).
 */

"use server";

import { revalidatePath } from "next/cache";

import { requireOperator } from "@/domains/production/access";
import { failedProductionState, type ProductionState } from "@/domains/production/state";
import { isValidUUIDv4 } from "@/lib/validation/id";

import { INSTRUCTION_FIELDS } from "./brief";
import { toggleBriefChecklist, updateBriefInstructions } from "./store";

const QUEUE_PATH = "/studio/production";

const jobPath = (jobId: string) => `${QUEUE_PATH}/${jobId}`;

/** A submitted job id, or null when it is not a real one. */
function readJobId(formData: FormData): string | null {
  const value = formData.get("jobId");
  return typeof value === "string" && isValidUUIDv4(value) ? value : null;
}

/**
 * Collect the instruction fields from a submitted form.
 *
 * Only the known instruction keys are read, and each is passed on as a string or
 * left out entirely, so a field the operator cleared is stored as absent rather
 * than as an empty string. Unknown extra fields in the form are simply ignored
 * here — the store validates again with `.strict()` before anything is written.
 */
function readInstructions(formData: FormData): Record<string, string> {
  const instructions: Record<string, string> = {};
  for (const field of INSTRUCTION_FIELDS) {
    const value = formData.get(field.key);
    if (typeof value === "string" && value.trim()) {
      instructions[field.key] = value;
    }
  }
  return instructions;
}

/** Save the operator's production instructions for one job. */
export async function saveInstructionsAction(
  _previous: ProductionState,
  formData: FormData,
): Promise<ProductionState> {
  const access = await requireOperator();
  const jobId = readJobId(formData);

  if (!jobId) return failedProductionState();

  try {
    await updateBriefInstructions(access, jobId, readInstructions(formData));
  } catch (error) {
    console.error("Production instructions were not saved:", error);
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "The instructions were not saved.",
      fieldErrors: {},
    };
  }

  revalidatePath(QUEUE_PATH, "layout");
  revalidatePath(jobPath(jobId));
  return { status: "idle", message: null, fieldErrors: {} };
}

/**
 * Tick or untick one production-checklist item.
 *
 * The submitted key is passed through as a plain string and the store refuses
 * anything outside the job's own template, so a forged key is rejected rather
 * than stored. `checked` is read as an explicit "on"/"true" so an unticked item
 * is an honest off rather than a missing value.
 */
export async function toggleChecklistAction(
  _previous: ProductionState,
  formData: FormData,
): Promise<ProductionState> {
  const access = await requireOperator();
  const jobId = readJobId(formData);
  const key = formData.get("key");
  const checkedValue = formData.get("checked");

  if (!jobId || typeof key !== "string" || !key) return failedProductionState();

  const checked = checkedValue === "on" || checkedValue === "true";

  try {
    await toggleBriefChecklist(access, jobId, key, checked);
  } catch (error) {
    console.error("Checklist item was not saved:", error);
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "The checklist item was not saved.",
      fieldErrors: {},
    };
  }

  revalidatePath(QUEUE_PATH, "layout");
  revalidatePath(jobPath(jobId));
  return { status: "idle", message: null, fieldErrors: {} };
}
