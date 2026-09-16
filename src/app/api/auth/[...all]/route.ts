import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/domains/auth/server";

/**
 * Better Auth catch-all route handler: /api/auth/*
 * All credential handling stays on the server; the client library only talks
 * to these endpoints.
 */
export const { GET, POST } = toNextJsHandler(auth.handler);
