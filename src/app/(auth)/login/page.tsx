import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/domains/auth/auth-form";
import { safeNextPath } from "@/domains/auth/next-path";
import { getSignedInSession } from "@/domains/auth/session";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Sign in — KeedoHub" };

/**
 * Sign-in screen. The `next` query parameter is validated server-side against
 * an allow-list of same-origin paths before it is ever used for a redirect.
 * Signed-in visitors are returned to their workspace.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  const session = await getSignedInSession();
  if (session) {
    redirect(nextPath);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-title text-balance">Welcome back</h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          Sign in to your KeedoHub workspace — your creative work, requests and
          profile in one place.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <AuthForm mode="signin" nextPath={nextPath} />
      </Suspense>

      <p className="text-sm text-muted-foreground">
        New to KeedoHub?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create your workspace
        </Link>
      </p>
    </div>
  );
}
