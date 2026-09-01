"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { privateNavigation } from "@/config/site";

export function PrivateNavbar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await fetch("/api/private/logout", { method: "POST" });
    } finally {
      router.replace("/yfxl99");
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="border-b border-[#cec5b8] print-hidden">
      <div className="container-shell flex min-h-[4.75rem] flex-wrap items-center justify-between gap-x-7 gap-y-2 py-3">
        <Link href="/yfxl99" className="display-type text-xl">Private Space</Link>
        <div className="flex max-w-full items-center gap-4 overflow-x-auto sm:gap-6">
          <nav aria-label="Private navigation" className="flex items-center gap-4 sm:gap-6">
            {privateNavigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`border-b py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${active ? "border-[#302d29]" : "border-transparent text-[#777067]"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <span
            className="border-l border-[#bcb4a9] pl-4 text-[0.68rem] font-semibold tracking-[0.08em] text-[#6d6257] sm:pl-6"
            title={`当前账号：${username}`}
          >
            @{username}
          </span>
          <button
            type="button"
            onClick={logout}
            disabled={isLoggingOut}
            className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#777067] disabled:opacity-50"
          >
            {isLoggingOut ? "Leaving…" : "Logout"}
          </button>
        </div>
      </div>
    </header>
  );
}
