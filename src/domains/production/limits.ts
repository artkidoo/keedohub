/**
 * Production limits shared by the server and the browser (Phase 3.1).
 *
 * Deliberately its own module with no server imports: the upload limit is shown
 * to the operator in the browser form, and a form may not import the storage or
 * database layers to learn it (they are server-only, and bundling them into a
 * client component is a build error — not just untidy).
 */

/** Largest production output accepted in this checkpoint (bytes). */
export const MAX_OUTPUT_BYTES = 25 * 1024 * 1024;

/** The same limit in whole megabytes, for honest help text. */
export const MAX_OUTPUT_MEGABYTES = Math.round(MAX_OUTPUT_BYTES / (1024 * 1024));
