import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Private Space",
  description: "A private personal archive.",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function PrivateRootLayout({ children }: { children: ReactNode }) {
  return <div className="private-surface min-h-screen">{children}</div>;
}
