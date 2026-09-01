"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { publicNavigation, siteConfig } from "@/config/site";

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
    <header className="sticky top-0 z-50 border-b border-[#cfcbc0]/80 bg-[#f4f1e9]/95 backdrop-blur-sm print-hidden">
      <div className="container-shell flex h-[4.75rem] items-center justify-between">
        <Link
          href="/"
          className="focus-ring text-sm font-bold tracking-[-0.02em]"
          onClick={() => setIsOpen(false)}
        >
          {siteConfig.name}
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="主导航">
          {publicNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`focus-ring border-b py-1 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                isActive(item.href)
                  ? "border-[#20221e] text-[#20221e]"
                  : "border-transparent text-[#696a62] hover:text-[#20221e]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="focus-ring flex size-10 items-center justify-center border border-[#bdb8ac] md:hidden"
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
          className="container-shell border-t border-[#cfcbc0] py-3 md:hidden"
        >
          {publicNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="focus-ring flex min-h-12 items-center justify-between border-b border-[#d8d3c8] text-sm"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
