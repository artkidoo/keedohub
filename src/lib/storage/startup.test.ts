/**
 * Storage startup: provider selection and S3 initialisation (Phase 5.2A).
 *
 * Pure environment validation with mocked S3 transport: no bucket is
 * contacted and no cloud credentials are needed. Each case saves and
 * restores the storage-related environment so tests never leak state.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { StorageError } from "./errors";
import { createStorageProvider } from "./index";
import { configureS3Provider, s3Write } from "./s3-provider";
import { createS3RestClient } from "./s3-client";
import { initStorageFromEnv } from "./startup";
import type { S3Client } from "./s3-provider";

const STORAGE_ENV = [
  "STORAGE_PROVIDER",
  "STORAGE_LOCAL_BASE_DIR",
  "S3_BUCKET",
  "S3_REGION",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_FORCE_PATH_STYLE",
];

function snapshotEnv(): Record<string, string | undefined> {
  return Object.fromEntries(STORAGE_ENV.map((k) => [k, process.env[k]]));
}

function restoreEnv(saved: Record<string, string | undefined>): void {
  for (const key of STORAGE_ENV) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

function withEnv(env: Record<string, string>, fn: () => void | Promise<void>): () => Promise<void> {
  return async () => {
    const saved = snapshotEnv();
    for (const key of STORAGE_ENV) delete process.env[key];
    Object.assign(process.env, env);
    try {
      await fn();
    } finally {
      restoreEnv(saved);
    }
  };
}

function mockS3(): S3Client & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    getObject: async (_b, k) => {
      calls.push(`get:${k}`);
      return Buffer.from("bytes");
    },
    putObject: async (_b, k) => {
      calls.push(`put:${k}`);
    },
    deleteObject: async (_b, k) => {
      calls.push(`del:${k}`);
    },
    headObject: async (_b, k) => {
      calls.push(`head:${k}`);
      return true;
    },
  };
}

test(
  "local provider is selected by default and uses the shared key format",
  withEnv({ STORAGE_LOCAL_BASE_DIR: `${process.cwd()}/.tmp-p52a-storage` }, async () => {
    const storage = createStorageProvider();
    assert.equal(storage.getKey("ws", "d", "a"), "ws/assets/d/a");
  }),
);

test(
  "unknown STORAGE_PROVIDER fails fast at startup",
  withEnv({ STORAGE_PROVIDER: "gcs" }, () => {
    assert.throws(
      () => initStorageFromEnv(),
      (e: unknown) => e instanceof StorageError && e.kind === "ConfigurationError",
    );
  }),
);

test(
  "s3 with a missing variable fails startup loudly",
  withEnv({ STORAGE_PROVIDER: "s3", S3_BUCKET: "keedohub-assets", S3_REGION: "eu-west-2" }, () => {
    assert.throws(
      () => initStorageFromEnv(),
      (e: unknown) => e instanceof StorageError && e.kind === "ConfigurationError",
    );
  }),
);

test(
  "s3 with complete configuration initialises and writes through the interface",
  withEnv(
    {
      STORAGE_PROVIDER: "s3",
      S3_BUCKET: "keedohub-assets",
      S3_REGION: "eu-west-2",
      S3_ENDPOINT: "https://s3.eu-west-2.amazonaws.com",
      S3_ACCESS_KEY_ID: "test-key",
      S3_SECRET_ACCESS_KEY: "test-secret",
    },
    async () => {
      initStorageFromEnv();
      const mock = mockS3();
      configureS3Provider({ bucket: "keedohub-assets", client: mock });
      await s3Write("ws/assets/d/a", Buffer.from("hello"));
      assert.deepEqual(mock.calls, ["put:ws/assets/d/a"]);
    },
  ),
);

test("REST client signs requests without leaking the secret", async () => {
  const seen: { auth: string | null; leak: boolean } = { auth: null, leak: false };
  const realFetch = globalThis.fetch;
  const stub = (async (url: unknown, init?: { headers?: unknown }) => {
    const headers = new Headers(init?.headers as HeadersInit);
    seen.auth = headers.get("authorization");
    seen.leak = `${url} ${JSON.stringify([...headers.entries()])}`.includes("test-secret-value");
    return new Response("ok", { status: 200 });
  }) as typeof fetch;
  (globalThis as unknown as { fetch: typeof fetch }).fetch = stub;
  try {
    const client = createS3RestClient({
      bucket: "b",
      region: "eu-west-2",
      endpoint: "https://s3.eu-west-2.amazonaws.com",
      accessKeyId: "test-key-id",
      secretAccessKey: "test-secret-value",
    });
    await client.putObject("b", "ws/assets/d/a", Buffer.from("x"));
    assert.match(seen.auth ?? "", /^AWS4-HMAC-SHA256 Credential=test-key-id\//);
    assert.equal(seen.leak, false);
  } finally {
    globalThis.fetch = realFetch;
  }
});
