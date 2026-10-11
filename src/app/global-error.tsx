/**
 * Global error screen (Phase 5.2B).
 *
 * Plain, non-technical, one way forward. No message, no digest, no stack —
 * error internals go to the server log via `logServerError`, never to the
 * browser. It is deliberately dependency-free (no Link, no router): it must
 * render even when the client runtime is what broke.
 */

"use client";

export default function GlobalError() {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: "#555", marginBottom: 16 }}>
              KeedoHub hit an unexpected problem. Please try again — and if it keeps
              happening, let us know what you were doing.
            </p>
            {/* Plain anchor: global-error renders outside the router, so Link is unavailable. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ textDecoration: "underline" }}>
              Back to home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
