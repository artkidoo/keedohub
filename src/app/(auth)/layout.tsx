import type { ReactNode } from "react";

import { WordmarkLink } from "@/components/layout/wordmark";

/**
 * Shared frame for the auth screens: minimal, calm, on-brand. No workspace
 * navigation — an unauthenticated visitor has nothing to navigate to.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 items-center px-5 sm:px-7">
        <WordmarkLink />
      </header>
      <main
        id="main"
        className="flex flex-1 items-start justify-center px-5 pb-16 pt-8 sm:items-center sm:pt-0"
      >
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
