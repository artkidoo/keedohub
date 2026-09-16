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
});

export type Session = typeof auth.$Infer.Session;