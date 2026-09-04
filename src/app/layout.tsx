import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { stripHighlightMarkers } from "@/lib/highlight-markers";
import "./globals.css";

const aventa = localFont({
  src: "./fonts/Aventa-Bold.woff2",
  variable: "--font-aventa",
  weight: "500",
  style: "normal",
  display: "swap",
});

const morganite = localFont({
  src: "./fonts/Morganite-Medium-8.woff2",
  variable: "--font-morganite",
  weight: "500",
  style: "normal",
  display: "swap",
});

const chenyuluoyan = localFont({
  src: "./fonts/ChenYuluoyan-Thin.woff2",
  variable: "--font-chenyuluoyan",
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
    <html lang="zh-CN" className={`${aventa.variable} ${morganite.variable} ${chenyuluoyan.variable}`}>
      <body>{children}</body>
    </html>
  );
}
