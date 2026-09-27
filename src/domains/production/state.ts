/**
 * The result of a production action, as the internal surface shows it.
 *
 * Serializable by design: the object crosses the server/client boundary as the
 * return value of a server action. A refusal is reported in the operator's own
 * language, because that is who reads it — the internal production vocabulary is
 * correct here and is never rendered to a customer (spec §24).
 */

export type ProductionState = {
  status: "idle" | "error";
  /** One sentence shown above the form. */
  message: string | null;
  /** Validation messages keyed by field name. */
  fieldErrors: Record<string, string>;
};

export const initialProductionState: ProductionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

/** The action could not be completed. Nothing was changed. */
export function failedProductionState(
  message = "That did not save. Nothing was changed — please try again.",
): ProductionState {
  return { status: "error", message, fieldErrors: {} };
}
