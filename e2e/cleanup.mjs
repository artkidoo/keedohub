/**
 * One-off cleanup for browser-test fixtures — Phase 5.3A.
 *
 * Run manually if a Playwright run is killed before its afterAll sweep:
 *   node e2e/cleanup.mjs
 *
 * Only ever deletes users whose email uses the reserved e2e.p53a.invalid
 * domain, so real customer rows cannot match.
 */

import postgres from "postgres";

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/keedohub";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

try {
  const removed = await sql`
    delete from "user"
    where email like ${"%@e2e.p53a.invalid"}
    returning email
  `;
  console.log(`REMOVED=${removed.length}`);
} finally {
  await sql.end();
}
