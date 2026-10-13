"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/domains/auth/client";
import { cn } from "@/lib/utils";

/**
 * Server-backed sign-out control.
 *
 * The session is revoked by Better Auth's `/api/auth/sign-out` endpoint, which
 * invalidates the session row and clears the `better-auth.session_token`
 * cookie. Nothing here is a client-side shortcut: the click does nothing until
 * that request has actually succeeded, and only then is the visitor returned to
 * the public site.
 *
 * Two details matter for the control to work at all:
 *
 * 1. Sign-out used to be a Base UI `Menu.Item` carrying an `onSelect` handler.
 *    `Menu.Item` exposes `onClick`, not `onSelect`, so that handler was never
 *    invoked: the item looked wired up, did nothing on click, and left the
 *    session cookie valid — a "signed-out" visitor could still open the
 *    workspace, including via the browser's back button.
 * 2. A `Menu.Item` may only exist inside its own `Menu.Root`. The mobile panel
 *    is not a menu, so it uses the plain-button variant of this control rather
 *    than nesting menu internals and crashing the shell.
 *
 * `as="menuitem"` renders the same control inside the desktop menu, where the
 * menu's own roving focus and keyboard handling still apply.
 */
export function SignOutControl({
  as = "button",
  className,
}: {
  /** "menuitem" inside a menu surface; "button" anywhere else. */
  as?: "menuitem" | "button";
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    if (pending) return;
    setError(null);
    setPending(true);

    try {
      const result = await authClient.signOut();

      if (result?.error) {
        // The session may still be valid — say so rather than pretending.
        setError("We could not sign you out. Please try again.");
        setPending(false);
        return;
      }

      // replace(), not push(): a signed-out visitor must not land back in the
      // workspace by pressing the browser's back button.
      router.replace("/");
      router.refresh();
    } catch {
      setError("We could not sign you out. Please try again.");
      setPending(false);
    }
  }

  const label = pending ? "Signing out…" : "Sign out";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        role={as === "menuitem" ? "menuitem" : undefined}
        disabled={pending}
        onClick={handleSignOut}
        className={cn(
          "flex min-h-11 cursor-default items-center rounded-md px-3 text-left text-sm text-danger outline-none select-none transition-colors",
          "hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-45 disabled:pointer-events-none disabled:opacity-45",
          "[&_svg]:size-4 [&_svg]:shrink-0",
          className,
        )}
      >
        {label}
      </button>
      {error ? (
        <p
          role="alert"
          data-testid="signout-error"
          className="px-3 pb-1 text-meta text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
