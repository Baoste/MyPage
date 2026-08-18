import type { ReactNode } from "react";
import { Footer } from "@/components/public/Footer";
import { PublicNavbar } from "@/components/public/PublicNavbar";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicNavbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
