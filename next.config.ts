import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Framework-level response headers (Phase 5.2B).
   *
   * Conservative by design: no CSP here. The Studio preview route already
   * pins `Content-Security-Policy: default-src 'none'; sandbox` on file
   * bytes, and a global CSP risks breaking Next.js inline scripts or auth
   * cookies without per-deployment tuning. These headers are safe everywhere:
   *   - nosniff stops MIME confusion on downloads;
   *   - same-origin framing blocks clickjacking while keeping previews working;
   *   - strict referrer policy keeps workspace URLs out of external requests;
   *   - HSTS is production-only (behind HTTPS) so local HTTP dev keeps working.
   */
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    if (process.env.NODE_ENV === "production") {
      security.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [{ source: "/:path*", headers: security }];
  },
};

export default nextConfig;
