import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/domains/auth/server";
import type { Session } from "@/domains/auth/server";

/**
 * Server-side session helpers. These are the ONLY way components learn about
 * authentication state; the client never decides authorization (spec §19).
 */

/** The current session, or null when unauthenticated. Safe in RSC. */
export async function getCurrentSession(): Promise<Session | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session ?? null;
}

/**
 * Best-effort session probe for redirect decisions on public pages.
 * Unlike `getCurrentSession`, an unreachable database resolves to "signed
 * out" so the login/signup screens always render instead of erroring.
 */
export async function getSignedInSession(): Promise<Session | null> {
  try {
    return await getCurrentSession();
  } catch {
    return null;
  }
}

export type CurrentUser = Session["user"];

/**
 * Require an authenticated user for a server component / server action.
 * Redirects unauthenticated visitors to the login route with a safe
 * `next` path so they can be returned afterwards.
 */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const session = await getCurrentSession();

  if (!session) {
    const target = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? `?next=${encodeURIComponent(returnTo)}`
      : "";
    redirect(`/login${target}`);
  }

  return session.user;
}
