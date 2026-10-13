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
 *
 * Sign-up asks for the one thing the product needs to know about a new
 * customer: what they create. The choice is posted with the credentials and
 * validated server-side by Better Auth itself — the account is never created
 * without it, and no client-supplied value can grant operator access (that
 * comes only from a live operator record keyed to the account).
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
    const accountType = String(form.get("accountType") ?? "");

    // The form is noValidate (consistent error styling), so the required
    // radio group is enforced here — and again, decisively, by Better Auth's
    // server endpoint. A missing choice never silently becomes a default.
    if (isSignUp && accountType !== "brand" && accountType !== "artist") {
      setError("Choose what you create to continue.");
      setPending(false);
      return;
    }

    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL: nextPath,
            accountType: accountType === "artist" ? "artist" : "brand",
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
      // /workspace then opens the right context from the workspace row.
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
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">What do you create?</legend>
          <p className="text-meta text-pretty text-muted-foreground">
            This decides which workspace KeedoHub opens for you.
          </p>
          <div className="flex flex-col gap-3 pt-1">
            <AccountTypeOption
              value="brand"
              title="Brand / business"
              description="Identity, documents, websites and marketing creative."
            />
            <AccountTypeOption
              value="artist"
              title="Artist / music"
              description="Cover artwork, releases and your artist brand."
            />
          </div>
        </fieldset>
      ) : null}

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

/**
 * One account-type choice, as a real radio input in a styled card. The
 * native input keeps keyboard and screen-reader behaviour (arrow keys, one
 * tab stop, radio-group semantics); the visible card is pure styling around
 * it, and the whole card is a click/touch target.
 */
function AccountTypeOption({
  value,
  title,
  description,
}: {
  value: string;
  title: string;
  description: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors",
        "hover:border-primary/40 hover:bg-primary-soft/30",
        "has-[:checked]:border-primary has-[:checked]:bg-primary-soft/50",
        "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/35",
      )}
    >
      <input
        type="radio"
        name="accountType"
        value={value}
        className="mt-1 size-4 shrink-0 accent-primary"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-meta text-pretty text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}
