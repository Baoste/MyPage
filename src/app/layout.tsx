import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { stripHighlightMarkers } from "@/lib/highlight-markers";
import "./globals.css";

const morganite = localFont({
  src: "./fonts/Aventa-Bold.woff2",
  variable: "--font-aventa",
  weight: "500",
  style: "normal",
  display: "swap",
});

const siteDescription = stripHighlightMarkers(siteConfig.description);

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.title}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.title}`,
    description: siteDescription,
    url: siteConfig.url,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f4f1e9",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" className={morganite.variable}>
      <body>{children}</body>
    </html>
  );
}
