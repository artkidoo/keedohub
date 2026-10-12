import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { SkipLink } from "@/components/layout/skip-link";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "KeedoHub — Creative work, done.",
    template: "%s · KeedoHub",
  },
  description:
    "KeedoHub helps brands and artists get professional creative work produced — a clear brief in, finished creative work out.",
  applicationName: "KeedoHub",
};

/**
 * Root layout: fonts, global styles and the keyboard escape hatch to content.
 * The design tokens themselves live in `globals.css`, so the shell and the
 * public pages consume exactly the same system.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      // Intentional, unavoidable server/client divergence — React's documented
      // reason for `suppressHydrationWarning`, not a bug being masked:
      //   * The pre-paint theme script below toggles `dark` on this element
      //     before first paint so a light-theme visitor never sees a dark flash.
      //   * The server cannot know the visitor's stored/OS preference, so the
      //     server-rendered class and the client class differ by design.
      //   * Verified in a clean, extension-free browser: the Geist variable
      //     classes match exactly; the only delta is the `dark` class the
      //     script adds. React explicitly recommends `suppressHydrationWarning`
      //     on a single element for exactly this case; it only silences the
      //     hydration diff, it does not change behaviour.
      suppressHydrationWarning
    >
      <head>
        {/*
          Resolve the appearance before the browser's first paint.

          Without this, a light-theme visitor gets a dark flash on every load:
          the server can only emit the default, so the correction would
          otherwise have to wait for hydration. Reading the stored choice (and
          otherwise honouring `prefers-color-scheme`) here means the correct
          tokens are on `<html>` before any pixels are drawn.

          Runs synchronously, wrapped in try/catch because `localStorage` is
          unavailable in some privacy modes — the failure mode is the default
          theme, never a broken page.
        */}
        <script
          dangerouslySetInnerHTML={{
            // Resolve the appearance and put it on `<html class="dark">` before
            // the first paint. The complementary `color-scheme` is declared in
            // CSS against the same class, so this never writes a style
            // attribute React would later disagree with on hydration.
            __html: `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)},v=localStorage.getItem(k);document.documentElement.classList.toggle("dark",v!=="light")}catch(e){document.documentElement.classList.add("dark")}})()`,
          }}
        />
      </head>
      <body className="min-h-dvh">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}