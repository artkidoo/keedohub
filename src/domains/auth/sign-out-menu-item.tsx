"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/domains/auth/client";
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

/** Server-backed sign-out. Clears the session, then returns to the public site. */
export function SignOutMenuItem() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <DropdownMenuItem
      disabled={pending}
      onSelect={async (event) => {
        event.preventDefault();
        setPending(true);
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </DropdownMenuItem>
  );
}
