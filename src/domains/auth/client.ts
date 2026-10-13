"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

import type { auth } from "@/domains/auth/server";

/**
 * Client-side auth binding. It can only call the server's /api/auth/* routes;
 * every authorization decision stays server-side.
 *
 * `inferAdditionalFields` is a type-only plugin: it carries the server's
 * `user.additionalFields` (the `accountType` sign-up choice) into the client
 * types so `signUp.email` accepts the field. The runtime request is unchanged
 * — Better Auth's server endpoint performs the actual validation.
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
