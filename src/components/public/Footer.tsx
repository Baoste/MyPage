import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[#cfcbc0] py-8 print-hidden">
      <div className="container-shell flex flex-col gap-5 text-xs text-[#696a62] sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {siteConfig.name}</p>
        <div className="flex items-center gap-5">
          {siteConfig.email ? <Link href={`mailto:${siteConfig.email}`}>Email</Link> : null}
          {siteConfig.github ? (
            <Link href={siteConfig.github} target="_blank" rel="noreferrer">
              GitHub
            </Link>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
