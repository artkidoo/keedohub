"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/domains/auth/client";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthFormProps = {
  mode: "signin" | "signup";
  /** Validated, same-origin path to return to after success. */
  nextPath: string;
};

/**
 * Email + password sign-in / sign-up form.
 *
 * All credential handling happens through Better Auth's server routes; the
 * client library only posts to /api/auth/*. Errors are shown in plain
 * language; no account-existence hints beyond what the server returns.
 */
export function AuthForm({ mode, nextPath }: AuthFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignUp = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL: nextPath,
          })
        : await authClient.signIn.email({
            email,
            password,
            callbackURL: nextPath,
          });

      if (result.error) {
        setError(
          isSignUp
            ? "We could not create your account. Check the details and try again."
            : "That email and password combination did not match. Try again.",
        );
        setPending(false);
        return;
      }

      // The workspace is provisioned server-side before this navigation.
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {isSignUp ? (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Name</span>
          <Input
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            placeholder="Your name"
          />
        </label>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Email</span>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Password</span>
        <Input
          name="password"
          type="password"
          required
          minLength={isSignUp ? 10 : undefined}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          placeholder={isSignUp ? "At least 10 characters" : "Your password"}
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants(), "min-h-12 w-full", pending && "opacity-70")}
      >
        {pending
          ? isSignUp
            ? "Creating your workspace…"
            : "Signing in…"
          : isSignUp
            ? "Create workspace"
            : "Sign in"}
      </button>
    </form>
  );
}
