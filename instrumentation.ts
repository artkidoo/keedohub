/**
 * Next.js server startup hook (Phase 5.2A).
 *
 * `register()` runs once per server instance before any route handles
 * traffic — the right boundary to validate storage configuration so a
 * misconfigured production deploy fails loudly at boot instead of losing
 * customer files at the first upload. Server-only: never imported by client
 * components.
 *
 * RUNTIME GUARD (important): `instrumentation` is evaluated in BOTH the Node.js
 * and Edge runtimes, and middleware runs on Edge. The storage layer depends on
 * `node:fs`/`node:path`, which do not exist on Edge — importing it there threw
 * `E394: Native module not found: node:fs` and 500'd every
 * middleware-protected route. Storage only ever runs in the Node.js runtime
 * (route handlers, server actions, server components), so initialise it there
 * only and return immediately on Edge. See:
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { initStorageFromEnv } = await import("./src/lib/storage/startup");
  initStorageFromEnv();
}
