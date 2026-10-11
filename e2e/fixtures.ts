/**
 * Browser-test fixtures — Phase 5.3A.
 *
 * Test accounts are created through the real `/signup` route (which goes
 * through Better Auth and provisions the workspace server-side) and removed by
 * a database sweep in `afterAll`. Nothing here touches the auth code path: no
 * cookie injection, no API shortcuts.
 */

import postgres from "postgres";

/** Resolve lazily so a .env loaded after import is still honoured. */
function resolveDbUrl(): string {
  if (!process.env.E2E_DATABASE_URL && !process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env");
    } catch {
      // fall through to the localhost default below
    }
  }
  return (
    process.env.E2E_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://postgres@127.0.0.1:5432/keedohub"
  );
}

/** Shared prefix so the cleanup sweep can never match real customer rows. */
export const E2E_EMAIL_DOMAIN = "e2e.p53a.invalid";
export const E2E_PASSWORD = "e2e-test-password-not-a-secret";

let created: string[] = [];

/** Registers an email for cleanup and returns it. */
export function e2eEmail(label: string): string {
  const email = `p53a-${label}-${Date.now().toString(36)}@${E2E_EMAIL_DOMAIN}`;
  created.push(email);
  return email;
}

/**
 * Deletes every user (and their dependent rows) created by this run.
 * Cascades are declared on the user table, so deleting the user removes
 * accounts, sessions, workspace and profiles. Runs even when a test fails.
 */
export async function cleanupE2eUsers(): Promise<void> {
  const sql = postgres(resolveDbUrl(), { max: 1, onnotice: () => {} });
  try {
    for (const email of created) {
      await sql`delete from "user" where email = ${email}`;
    }
    // Safety net: any earlier crashed run that used the same domain.
    await sql`delete from "user" where email like ${`%@${E2E_EMAIL_DOMAIN}`}`;
  } finally {
    created = [];
    await sql.end();
  }
}
