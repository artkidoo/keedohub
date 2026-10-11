/**
 * Shared rate-limit interface for KeedoHub mutations (Phase 5.2B).
 *
 * Server actions run behind a single Next server, not a serverless fleet, in
 * every deployment this checkpoint targets — so a Map-backed sliding window
 * is honest here. It is deliberately NOT presented as a distributed limiter:
 * if KeedoHub ever moves to multi-instance hosting, replace `MemoryRateLimit`
 * with a shared-backend implementation of `RateLimitStore` (Redis/Upstash)
 * without touching call sites. `RATE_LIMIT_REDIS_URL` documents that path.
 *
 * Failure behaviour is fail-OPEN with a logged warning: a limiter must never
 * lock every user out because its backend is down. Sensitive routes log the
 * bypass; the underlying authorisation checks still run.
 */

export type RateLimitDecision = {
  allowed: boolean;
  /** Seconds until the caller may retry (present when refused). */
  retryAfterSeconds?: number;
};

export type RateLimitStore = {
  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitDecision>;
};

/** Sliding-window limiter over a Map. Single-instance only (see above). */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, number[]>();

  async check(key: string, limit: number, windowSeconds: number): Promise<RateLimitDecision> {
    const now = Date.now();
    const cutoff = now - windowSeconds * 1000;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (recent.length >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + windowSeconds * 1000 - now) / 1000));
      this.hits.set(key, recent);
      return { allowed: false, retryAfterSeconds };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true };
  }
}

const globalForRateLimit = globalThis as unknown as {
  keedohubRateLimitStore?: RateLimitStore;
};

/** Process-wide store, so every server action shares one window. */
export function getRateLimitStore(): RateLimitStore {
  globalForRateLimit.keedohubRateLimitStore ??= new MemoryRateLimitStore();
  return globalForRateLimit.keedohubRateLimitStore;
}

export type RateLimitRule = {
  /** Buckets are namespaced per rule, so auth and upload windows never share. */
  name: string;
  limit: number;
  windowSeconds: number;
};

/**
 * Check one rate-limit rule. Returns true when the caller may proceed.
 * Never throws: on store failure the call is allowed and the bypass is
 * logged, so a limiter outage cannot lock out the whole product.
 */
export async function checkRateLimit(rule: RateLimitRule, key: string): Promise<RateLimitDecision> {
  try {
    return await getRateLimitStore().check(`${rule.name}:${key}`, rule.limit, rule.windowSeconds);
  } catch (error) {
    console.error(`Rate limit bypassed (${rule.name}): limiter unavailable`, (error as Error)?.message ?? error);
    return { allowed: true };
  }
}

/** Generous per-account windows for the sensitive mutations of this checkpoint. */
export const RATE_LIMITS = {
  /** Auth-adjacent mutations (signup/login are Better-Auth routes; this covers app-level ones). */
  auth: { name: "auth", limit: 30, windowSeconds: 60 } satisfies RateLimitRule,
  /** File uploads: an operator batching versions should never trip this. */
  upload: { name: "upload", limit: 20, windowSeconds: 60 } satisfies RateLimitRule,
  /** Review decisions: a customer double-clicking Approve must not be refused. */
  review: { name: "review", limit: 20, windowSeconds: 60 } satisfies RateLimitRule,
} as const;
