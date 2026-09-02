import type { ReactNode } from "react";
import { Footer } from "@/components/public/Footer";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import styles from "@/components/public/PublicSite.module.css";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div id="top" className={styles.publicSite}>
      <PublicNavbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
