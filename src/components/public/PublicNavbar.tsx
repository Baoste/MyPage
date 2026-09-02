"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { publicNavigation, siteConfig } from "@/config/site";
import styles from "@/components/public/PublicSite.module.css";

export function PublicNavbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" && hash !== "#works";
    if (href === "/#works") return pathname === "/" && hash === "#works";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className={`${styles.navbar} print-hidden`}>
      <div className={styles.navbarInner}>
        <Link
          href="/"
          className={`${styles.brand} focus-ring`}
          onClick={() => setIsOpen(false)}
        >
          {siteConfig.name}
        </Link>

        <nav className={styles.desktopNav} aria-label="主导航">
          {publicNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`${styles.navLink} ${isActive(item.href) ? styles.activeNavLink : ""} focus-ring`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href={`mailto:${siteConfig.email}`} className={`${styles.talkLink} focus-ring`}>
          联系我&nbsp; <span aria-hidden="true">↗</span>
        </Link>

        <button
          type="button"
          className={`${styles.mobileMenuButton} focus-ring`}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "关闭菜单" : "打开菜单"}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            {isOpen ? "×" : "≡"}
          </span>
        </button>
      </div>

      {isOpen ? (
        <nav
          id="mobile-navigation"
          aria-label="移动端导航"
          className={styles.mobileNav}
        >
          {publicNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`${styles.mobileNavLink} focus-ring`}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
              <span aria-hidden="true">{isActive(item.href) ? "●" : "↗"}</span>
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
