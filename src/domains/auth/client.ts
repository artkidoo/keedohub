"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Client-side auth binding. It can only call the server's /api/auth/* routes;
 * every authorization decision stays server-side.
 */
export const authClient = createAuthClient();
