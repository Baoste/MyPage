import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import "./globals.css";

const morganite = localFont({
  src: "./fonts/Morganite-Medium-8.woff2",
  variable: "--font-morganite",
  weight: "500",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.title}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.title}`,
    description: siteConfig.description,
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
