import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[#cfcbc0] py-8 print-hidden">
      <div className="container-shell text-xs text-[#696a62]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}</p>
          <div className="flex items-center gap-5">
            {siteConfig.email ? <Link href={`mailto:${siteConfig.email}`}>邮箱</Link> : null}
            {siteConfig.github ? (
              <Link href={siteConfig.github} target="_blank" rel="noreferrer">
                GitHub
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-6 border-t border-[#d8d3c8] pt-4">
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noreferrer"
            className="focus-ring group inline-flex items-center gap-2 text-[0.68rem] tracking-[0.08em] text-[#77766e] transition-colors duration-[90ms] hover:text-[#20221e] motion-reduce:transition-none"
          >
            <span
              aria-hidden="true"
              className="size-1.5 rotate-45 bg-[#a64b2a] transition-transform duration-[90ms] ease-out group-hover:rotate-90 motion-reduce:transition-none motion-reduce:group-hover:rotate-45"
            />
            京ICP备2026056138号
            <span aria-hidden="true" className="transition-transform duration-[90ms] ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0">
              ↗
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
