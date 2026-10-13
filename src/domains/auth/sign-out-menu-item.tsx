"use client";

import { SignOutControl } from "@/domains/auth/sign-out-control";

/**
 * Sign-out as it appears inside the desktop workspace menu.
 *
 * The control itself lives in `sign-out-control.tsx` and is shared with the
 * mobile panel; this wrapper only adapts it to the menu surface so both
 * layouts offer exactly the same behaviour.
 */
export function SignOutMenuItem() {
  return <SignOutControl as="menuitem" />;
}
