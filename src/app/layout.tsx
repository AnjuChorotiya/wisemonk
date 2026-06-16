import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wisemonk EOR — Onboarding",
  description:
    "Organization and employee onboarding flows for Wisemonk EOR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,500;12..96,600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: "var(--wm-bg)" }}>
        {children}
        {/* Dev notes — drop-in design annotations. Toggle stays hidden until an
            element has data-wm-note. */}
        <Script
          src="https://anjuchorotiya.github.io/Client-freelancer/wisemonk-ui/dev-notes.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
