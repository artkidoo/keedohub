#!/usr/bin/env node
/**
 * Internal Studio operator provisioning (Phase 4.4, spec §19.2, §19.3).
 *
 * This is a SERVER-SIDE administrative CLI. It is the ONLY way an operator
 * record is created, and it is deliberately not reachable from the product:
 *
 *   - it is a script under `scripts/`, so Next never bundles it and no route,
 *     server action or client component imports it;
 *   - it runs on the machine that holds the database credentials
 *     (`DATABASE_URL`), so the ability to grant Studio access is the ability to
 *     reach the database — exactly the trust boundary that should decide it;
 *   - a customer cannot invoke it, cannot discover it from the UI, and has no
 *     write path to the `operator` table from the app at all.
 *
 * There is intentionally NO "become an operator" screen, no self-promotion and
 * no email-allowlist shortcut: a role kept in a client token, an environment
 * flag, a hidden button or a matching email address is not authorisation.
 * Authorisation is a live `operator` row, which only this tool writes.
 *
 * Usage
 *   npm run studio:operator -- list
 *   npm run studio:operator -- add <email> [--role owner|operator] [--label "Name"]
 *   npm run studio:operator -- revoke <email>
 *   npm run studio:operator -- restore <email>
 *
 * `add` is idempotent: the account must already exist (people sign up through
 * the product), and running it again updates the role/label rather than
 * creating a second row — `operator_user_id_unique` would refuse that anyway.
 * `revoke` is a state change, never a delete, so attribution on past work stays
 * intact and access can be restored.
 */

try {
  // .env is optional; DATABASE_URL may already be in the environment.
  process.loadEnvFile();
} catch {
  /* no .env file present */
}

const postgres = (await import("postgres")).default;

const ROLE_VALUES = ["operator", "owner"];

const USAGE = `KeedoHub Studio operator provisioning (internal, server-side)

  list                                  Show every operator record
  add <email> [--role operator|owner]   Grant Studio access (idempotent)
              [--label "Studio name"]
  revoke <email>                        Revoke access (keeps the record)
  restore <email>                       Restore revoked access

Requires DATABASE_URL. Run from the repository root.`;

/** Split `--flag value` / `--flag=value` from positionals. */
function parseArgs(args) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const [key, inline] = token.slice(2).split("=");
    if (inline !== undefined) {
      flags[key] = inline;
    } else if (args[i + 1] && !args[i + 1].startsWith("--")) {
      flags[key] = args[i + 1];
      i += 1;
    } else {
      flags[key] = true;
    }
  }
  return { positional, flags };
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exitCode = 1;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  fail(
    "DATABASE_URL is not set. Add it to .env (see .env.example) or export it before running this tool.",
  );
  process.exit(1);
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const command = positional[0];

if (!command || command === "help" || flags.help) {
  console.log(USAGE);
  process.exit(command ? 0 : 1);
}

const sql = postgres(databaseUrl, { max: 1, idle_timeout: 5, connect_timeout: 10 });

/** Resolve an account by email. The account must exist: people sign up. */
async function findAccount(email) {
  const [account] = await sql`
    select id, email, name from "user" where lower(email) = lower(${email})
  `;
  return account ?? null;
}

/** Every operator record, including revoked ones. */
async function list() {
  const rows = await sql`
    select u.email, u.name, o.display_name, o.role, o.active
      from operator o
      join "user" u on u.id = o.user_id
     order by o.created_at
  `;
  if (rows.length === 0) {
    console.log("No operator records. Nobody can reach /studio yet.");
    return;
  }
  for (const row of rows) {
    const state = row.active ? "active " : "revoked";
    const label = row.display_name ? ` (${row.display_name})` : "";
    console.log(`${state}  ${row.role.padEnd(8)}  ${row.email}${label}`);
  }
}

async function add(email, role, label) {
  if (!email) return fail("add requires an email address.");
  if (!ROLE_VALUES.includes(role)) {
    return fail(`--role must be one of: ${ROLE_VALUES.join(", ")}.`);
  }

  const account = await findAccount(email);
  if (!account) {
    return fail(
      `No account exists for ${email}. The person must sign up first — this tool grants access to an existing account and never creates one.`,
    );
  }

  const [existing] = await sql`
    select id from operator where user_id = ${account.id}
  `;

  if (existing) {
    await sql`
      update operator
         set role = ${role},
             display_name = ${label ?? null},
             active = true
       where id = ${existing.id}
    `;
    console.log(`updated  ${account.email} — role ${role}, active.`);
    return;
  }

  const [created] = await sql`
    insert into operator (user_id, role, display_name)
    values (${account.id}, ${role}, ${label ?? null})
    returning id
  `;
  console.log(`created  ${account.email} — role ${role} (operator ${created.id}).`);
}

/** Revoke or restore without ever deleting the record (spec §19.4). */
async function setActive(email, active) {
  if (!email) return fail(`${active ? "restore" : "revoke"} requires an email address.`);
  const account = await findAccount(email);
  if (!account) return fail(`No account exists for ${email}.`);

  const updated = await sql`
    update operator
       set active = ${active}
     where user_id = ${account.id}
    returning id
  `;
  if (updated.length === 0) return fail(`${account.email} has no operator record.`);

  console.log(`${active ? "restored" : "revoked"}  ${account.email}.`);
}

try {
  switch (command) {
    case "list":
      await list();
      break;
    case "add":
      await add(positional[1], flags.role ?? "operator", flags.label);
      break;
    case "revoke":
      await setActive(positional[1], false);
      break;
    case "restore":
      await setActive(positional[1], true);
      break;
    default:
      console.log(USAGE);
      fail(`unknown command: ${command}`);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await sql.end({ timeout: 5 });
}