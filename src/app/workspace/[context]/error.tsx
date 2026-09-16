"use client";

import { useEffect } from "react";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

/**
 * Error boundary for a workspace context. Customer copy stays plain, no
 * internals are shown, and the failure is reported for operators instead
 * (spec §24.4).
 */
export default function WorkspaceContextError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="py-8 sm:py-12">
      <ErrorState
        title="Something went wrong"
        description="This part of your workspace could not be loaded. Nothing has been changed — you can try again."
        action={
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        }
      />
    </Container>
  );
}