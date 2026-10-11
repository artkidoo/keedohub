import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { getDb } from "@/lib/db";
import {
  account,
  artistProfile,
  brandProfile,
  session,
  user,
  verification,
  workspace,
} from "@/lib/db/schema";

/**
 * Explicit production origins for Better Auth (Phase 5.2B).
 *
 * `BETTER_AUTH_URL` stays the canonical app origin. `AUTH_TRUSTED_ORIGINS`
 * optionally lists extra origins (comma-separated) for preview deployments.
 * Empty in development; in production every entry must be an https: URL, and
 * a malformed value fails startup loudly rather than silently widening trust.
 */
function trustedOrigins(): string[] {
  const raw = (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV === "production") {
    for (const origin of raw) {
      let url: URL;
      try {
        url = new URL(origin);
      } catch {
        throw new Error(`AUTH_TRUSTED_ORIGINS contains an invalid URL: ${JSON.stringify(origin)}.`);
      }
      if (url.protocol !== "https:") {
        throw new Error(`AUTH_TRUSTED_ORIGINS must be https: in production, got ${JSON.stringify(origin)}.`);
      }
    }
  }
  return raw;
}

/**
 * KeedoHub authentication (Better Auth).
 *
 * - Sessions are database-backed and resolved server-side only; nothing about
 *   authorization is stored or decided in the client.
 * - Email + password is enabled; social providers can be added later without
 *   schema churn (accounts table is provider-agnostic).
 * - When a user is created, their workspace and its Brand and Artist contexts
 *   are provisioned in the same flow. A workspace always belongs to exactly
 *   one user; both contexts exist from the start and neither is mandatory
 *   (spec §5).
 */
export const auth = betterAuth({
  trustedOrigins: trustedOrigins(),
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    // Drizzle table objects, keyed by Better Auth's model names.
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
  },
  session: {
    // 30 days with daily refresh while active: unchanged in this checkpoint.
    // Shortening would churn customer sessions without new evidence; the
    // session token is httpOnly + secure in production via Better Auth's
    // nextCookies plugin, and every request re-authorises server-side.
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once a day while active
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          const db = getDb();
          const slug =
            createdUser.id.slice(0, 8) ||
            Math.random().toString(36).slice(2, 10);

          await db.insert(workspace).values({
            userId: createdUser.id,
            name: `${createdUser.name || "Your"} workspace`,
            slug: `ws-${slug}`,
          });

          const ws = await db.query.workspace.findFirst({
            where: (w, { eq }) => eq(w.userId, createdUser.id),
          });

          if (ws) {
            await db.insert(brandProfile).values({ workspaceId: ws.id });
            await db.insert(artistProfile).values({ workspaceId: ws.id });
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
  /**
   * Better Auth's own rate limiter is OPT-IN: without `enabled: true` the
   * guard in `dist/api/rate-limiter/index.mjs` returns early and NO auth
   * endpoint is throttled at all (verified live: 40/40 rapid sign-in
   * attempts all returned non-429 before this line was added).
   *
   * Defaults apply once enabled: /sign-in, /sign-up, /change-password and
   * /change-email are limited to 3 attempts per 10s; password-reset and
   * verification-email paths to 3 per 60s.
   *
   * SINGLE-INSTANCE LIMITATION: the default backend is in-process memory, so
   * across multiple serverless instances each instance counts separately and
   * an attacker gets N x the intended budget. This is a meaningful improvement
   * over none, not a distributed defence. Point `storage`/`storage` + a
   * shared store (Redis/Upstash) here before high-volume public launch; see
   * `src/lib/rate-limit.ts` for the same caveat on app mutations.
   */
  rateLimit: {
    enabled: true,
  },
});

export type Session = typeof auth.$Infer.Session;