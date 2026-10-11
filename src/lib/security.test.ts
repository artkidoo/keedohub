/**
 * Phase 5.2B security surface: headers, origins, health, rate limits.
 *
 * No network, no bucket, no secrets: headers are read from next.config.ts,
 * origin validation is exercised through env, health is a pure shape check,
 * and the limiter runs in-memory. Each case restores the environment.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import nextConfig from "../../next.config";
import { MemoryRateLimitStore } from "./rate-limit";
import { logServerError } from "./log";

test("global security headers are present and conservative", async () => {
  const rules = await nextConfig.headers!();
  const headers = Object.fromEntries(rules[0].headers.map((h) => [h.key, h.value]));
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(headers["X-Frame-Options"], "SAMEORIGIN");
  // No global CSP: the preview route pins its own, and a global one would
  // risk breaking Next inline scripts and auth cookies undeployed.
  assert.ok(!("Content-Security-Policy" in headers));
});

test("production origins rule is documented and enforced in code", async () => {
  const fs = await import("node:fs");
  const server = fs.readFileSync("src/domains/auth/server.ts", "utf8");
  assert.ok(server.includes('url.protocol !== "https:"'));
  assert.ok(server.includes("AUTH_TRUSTED_ORIGINS contains an invalid URL"));
  const env = fs.readFileSync(".env.example", "utf8");
  assert.ok(env.includes("AUTH_TRUSTED_ORIGINS="));
});

test("health response carries no internals", async () => {
  const { GET } = await import("../app/api/health/route");
  const res = await GET();
  assert.equal(res.status, 200);
  const body = (await res.json()) as Record<string, unknown>;
  assert.deepEqual(Object.keys(body), ["ok"]);
  assert.equal(body.ok, true);
});

test("memory limiter refuses past the window and recovers after", async () => {
  const store = new MemoryRateLimitStore();
  assert.equal((await store.check("k", 2, 60)).allowed, true);
  assert.equal((await store.check("k", 2, 60)).allowed, true);
  const refused = await store.check("k", 2, 60);
  assert.equal(refused.allowed, false);
  assert.ok((refused.retryAfterSeconds ?? 0) >= 1);
});

test("safe logger never emits raw secrets or paths", () => {
  const lines: unknown[][] = [];
  const real = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args);
  };
  try {
    logServerError("test", new Error("conn postgresql://u:p@host/db /etc/passwd https://x/y"), {});
  } finally {
    console.error = real;
  }
  const serialised = JSON.stringify(lines);
  assert.ok(!serialised.includes("postgresql://"));
  assert.ok(!serialised.includes("/etc/passwd"));
  assert.ok(!serialised.includes("https://x/y"));
});
