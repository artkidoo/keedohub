import { CircleAlert } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { WordmarkLink } from "@/components/layout/wordmark";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

/** Global not-found screen: plain language, one clear way forward. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center px-5 sm:px-7 lg:px-10">
        <WordmarkLink />
      </header>
      <main id="main" className="flex flex-1 items-center">
        <Container className="py-14 sm:py-20">
          <EmptyState
            icon={CircleAlert}
            title="We could not find that page"
            description="The link may be out of date, or the page may not exist yet."
            action={
              <Link href="/" className={cn(buttonVariants())}>
                Back to home
              </Link>
            }
          />
        </Container>
      </main>
    </div>
  );
}