/**
 * Minimal S3-compatible REST client for KeedoHub (Phase 5.2A).
 *
 * Speaks the S3 REST API directly over `fetch` with AWS Signature Version 4,
 * so production storage needs no new SDK dependency: it works against AWS S3
 * and S3-compatible endpoints (MinIO, R2, etc.) through the `S3Client`
 * interface in `s3-provider.ts`.
 *
 * Server-only. Constructed once at startup from validated environment
 * variables (see `src/lib/storage/startup.ts`) — never in a client component,
 * never with credentials in a browser bundle. Errors carry status context but
 * never secret material.
 */

import { createHmac, createHash } from "node:crypto";

import type { S3Client } from "./s3-provider";

/** Everything needed to reach one S3-compatible bucket. */
export type S3ClientOptions = {
  /** Bucket holding KeedoHub assets. */
  bucket: string;
  /** AWS region (e.g. `eu-west-2`); required for SigV4 even on custom endpoints. */
  region: string;
  /** Base endpoint, e.g. `https://s3.eu-west-2.amazonaws.com` or a MinIO/R2 URL. */
  endpoint: string;
  /** Access key id (server-side secret). */
  accessKeyId: string;
  /** Secret access key (server-side secret; never logged). */
  secretAccessKey: string;
  /** Whether to address the bucket path-style (`endpoint/bucket/key`). */
  forcePathStyle?: boolean;
};

function encodeKey(key: string): string {
  // S3 keys keep `/` separators; every segment is percent-encoded.
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function sha256Hex(data: string | Buffer | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function signingKey(secret: string, date: string, region: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

function amzDate(now: Date): { full: string; day: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const full =
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  return { full, day: full.slice(0, 8) };
}

/**
 * Build an S3 REST client over `fetch`. Pure construction: reads nothing from
 * the environment and performs no I/O, so tests can build it freely.
 */
export function createS3RestClient(options: S3ClientOptions): S3Client {
  const base = options.endpoint.replace(/\/+$/, "");
  const pathStyle = options.forcePathStyle ?? (base.includes("localhost") || base.includes("127.0.0.1"));

  const objectUrl = (key: string) => {
    const encoded = encodeKey(key);
    return pathStyle
      ? `${base}/${options.bucket}/${encoded}`
      : `${base}/${encoded}`;
  };

  const hostOf = (key: string) => new URL(objectUrl(key)).host;

  async function signedFetch(key: string, method: string, body?: Buffer | Uint8Array): Promise<Response> {
    const url = objectUrl(key);
    const now = new Date();
    const { full, day } = amzDate(now);
    const payloadHash = body ? sha256Hex(body) : sha256Hex("");
    const scope = `${day}/${options.region}/s3/aws4_request`;

    const canonicalHeaders =
      `host:${hostOf(key)}\n` + `x-amz-content-sha256:${payloadHash}\n` + `x-amz-date:${full}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = [method, new URL(url).pathname, "", canonicalHeaders, signedHeaders, payloadHash].join(
      "\n",
    );
    const stringToSign = ["AWS4-HMAC-SHA256", full, scope, sha256Hex(canonicalRequest)].join("\n");
    const signature = hmac(signingKey(options.secretAccessKey, day, options.region), stringToSign).toString("hex");
    const authorization =
      `AWS4-HMAC-SHA256 Credential=${options.accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return fetch(url, {
      method,
      headers: {
        authorization,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": full,
      },
      // Blob is valid BodyInit in every fetch typing; bytes are hashed above.
      body: body ? new Blob([body as BlobPart]) : undefined,
    });
  }

  return {
    async getObject(_bucket, key) {
      const res = await signedFetch(key, "GET");
      if (res.status === 404 || res.status === 403) return undefined;
      if (!res.ok) throw new Error(`S3 GET failed with status ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    },
    async putObject(_bucket, key, data) {
      const res = await signedFetch(key, "PUT", Buffer.isBuffer(data) ? data : Buffer.from(data));
      if (!res.ok) throw new Error(`S3 PUT failed with status ${res.status}`);
    },
    async deleteObject(_bucket, key) {
      const res = await signedFetch(key, "DELETE");
      // Idempotent: a missing object is success.
      if (!res.ok && res.status !== 404 && res.status !== 204) {
        throw new Error(`S3 DELETE failed with status ${res.status}`);
      }
    },
    async headObject(_bucket, key) {
      const res = await signedFetch(key, "HEAD");
      return res.ok;
    },
  };
}
