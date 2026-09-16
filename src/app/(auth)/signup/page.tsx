import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/domains/auth/auth-form";
import { safeNextPath } from "@/domains/auth/next-path";
import { getSignedInSession } from "@/domains/auth/session";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Create your workspace — KeedoHub" };

/**
 * Sign-up screen. Workspace + Brand/Artist contexts are provisioned server-side.
 * Signed-in visitors are returned to their workspace instead.
 */
export default async function SignupPage({
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
        <h1 className="text-title text-balance">Create your workspace</h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          One workspace for you and KeedoHub — with a Brand and an Artist
          context ready when you are.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <AuthForm mode="signup" nextPath={nextPath} />
      </Suspense>

      <p className="text-sm text-muted-foreground">
        Already have a workspace?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
