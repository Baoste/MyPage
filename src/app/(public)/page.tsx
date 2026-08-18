import Link from "next/link";
import { ProjectGallery } from "@/components/public/ProjectGallery";
import { siteConfig } from "@/config/site";
import { getPublishedProjects } from "@/services/projectService";

export const revalidate = 300;

export default async function HomePage() {
  const projects = await getPublishedProjects();

  return (
    <>
      <section className="container-shell grid min-h-[68vh] content-between gap-16 border-b border-[#cfcbc0] py-12 md:grid-cols-[1fr_1.25fr] md:py-20 lg:py-24">
        <div className="flex items-start justify-between md:block">
          <p className="eyebrow">Independent portfolio · 2026</p>
          <span className="mt-[-0.35rem] text-3xl text-[#a64b2a]" aria-hidden="true">✦</span>
        </div>
        <div className="self-end">
          <h1 className="display-type text-balance text-[clamp(3.3rem,8.2vw,7.6rem)] leading-[0.9]">
            Thoughtful work for the useful web.
          </h1>
          <div className="mt-8 grid gap-6 border-t border-[#bdb8ac] pt-5 sm:grid-cols-2">
            <p className="max-w-sm text-sm leading-6 text-[#555750]">
              {siteConfig.description}
            </p>
            <div className="flex items-start gap-5 text-xs font-semibold uppercase tracking-[0.12em] sm:justify-end">
              <Link href="#works">View work ↓</Link>
              <Link href="/articles">Read notes ↗</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="works" aria-labelledby="works-heading" className="container-shell py-20 md:py-28">
        <div className="mb-12 grid gap-4 md:grid-cols-[1fr_2fr] md:items-end">
          <p className="eyebrow">Selected work</p>
          <div className="flex items-end justify-between gap-8">
            <h2 id="works-heading" className="display-type text-5xl md:text-6xl">A few things<br />worth sharing.</h2>
            <p className="hidden max-w-[13rem] text-right text-xs leading-5 text-[#696a62] lg:block">
              Product, interface, and engineering work selected for clarity and care.
            </p>
          </div>
        </div>
        <ProjectGallery projects={projects} />
      </section>
    </>
  );
}
