import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { SkipLink } from "@/components/layout/skip-link";
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
    >
      <body className="min-h-dvh">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}