/**
 * Appearance preference — the one place the storage key and the default are
 * decided.
 *
 * Plain module, deliberately not a Client Component, so both the server layout
 * (pre-paint script) and the client toggle can import the same key without
 * crossing the server/client boundary with a runtime value.
 *
 * The value in storage is the *resolved* appearance, not "system": an explicit
 * choice is recorded so it survives an OS change, while a visitor who never
 * chooses keeps following `prefers-color-scheme`.
 */

export type Theme = "dark" | "light";

/** localStorage key for the visitor's stored choice. */
export const THEME_STORAGE_KEY = "keedohub-theme";

/**
 * Dark is the product default (spec §27); light is the refined alternative.
 *
 * Deliberately unconditional. A first-time visitor gets dark whatever their OS
 * is set to: the brand identity is dark-first, and a homepage that silently
 * rendered light on a light-mode machine would be a different page to review.
 * The light theme is reached by *choosing* it, via the toggle — which then
 * persists, so the choice survives an OS change.
 */
export const DEFAULT_THEME: Theme = "dark";

/** Narrow an unknown stored string to a theme, or null if it is not one. */
export function parseTheme(value: unknown): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}
