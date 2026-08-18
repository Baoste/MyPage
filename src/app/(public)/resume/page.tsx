import type { Metadata } from "next";
import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { resumeData } from "@/data/resume";

export const metadata: Metadata = {
  title: "Resume",
  description: `Experience, projects, and skills — ${siteConfig.name}.`,
};

export default function ResumePage() {
  const hasResumePdf = existsSync(path.join(process.cwd(), "public", "resume", "resume.pdf"));

  return (
    <div className="container-shell py-14 md:py-24">
      <header className="grid gap-10 border-b border-[#bdb8ac] pb-12 md:grid-cols-[1fr_2fr]">
        <div>
          <p className="eyebrow">Curriculum vitae</p>
          <p className="mt-5 text-sm text-[#696a62]">Available for thoughtful work.</p>
        </div>
        <div>
          <h1 className="display-type text-6xl md:text-8xl">{siteConfig.name}</h1>
          <div className="mt-8 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.1em] print-hidden">
            {hasResumePdf ? (
              <Link href="/resume/resume.pdf" download className="border border-[#20221e] px-5 py-3 hover:bg-[#20221e] hover:text-[#f4f1e9]">
                Download resume
              </Link>
            ) : (
              <span className="border border-[#bdb8ac] px-5 py-3 text-[#77766e]" aria-label="Resume PDF has not been configured">
                PDF coming soon
              </span>
            )}
            <Link href={`mailto:${siteConfig.email}`} className="px-1 py-3">Contact ↗</Link>
          </div>
        </div>
      </header>

      <div className="grid gap-x-12 md:grid-cols-[1fr_2fr]">
        <ResumeSection number="01" title="Profile">
          <p className="max-w-2xl text-base leading-7 text-[#4f514b]">{resumeData.profile}</p>
        </ResumeSection>

        <ResumeSection number="02" title="Experience">
          {resumeData.experience.map((item) => (
            <ResumeEntry key={item.company} title={item.role} meta={`${item.company} · ${item.period}`}>
              {item.description}
            </ResumeEntry>
          ))}
        </ResumeSection>

        <ResumeSection number="03" title="Education">
          {resumeData.education.map((item) => (
            <ResumeEntry key={item.school} title={item.school} meta={item.period}>{item.detail}</ResumeEntry>
          ))}
        </ResumeSection>

        <ResumeSection number="04" title="Projects">
          {resumeData.projects.map((item) => (
            <ResumeEntry key={item.name} title={item.name}>{item.description}</ResumeEntry>
          ))}
        </ResumeSection>

        <ResumeSection number="05" title="Skills">
          <ul className="flex max-w-2xl flex-wrap gap-x-5 gap-y-3">
            {resumeData.skills.map((skill) => <li key={skill} className="text-sm">{skill}</li>)}
          </ul>
        </ResumeSection>

        <ResumeSection number="06" title="Contact">
          <Link href={`mailto:${siteConfig.email}`} className="display-type text-2xl underline decoration-1 underline-offset-4">
            {siteConfig.email}
          </Link>
        </ResumeSection>
      </div>
    </div>
  );
}

function ResumeSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-[#cfcbc0] py-10 md:col-span-2 md:grid-cols-[1fr_2fr]">
      <h2 className="flex gap-4 text-sm font-semibold"><span className="text-[#a64b2a]">{number}</span>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function ResumeEntry({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <article className="mb-8 last:mb-0">
      <h3 className="display-type text-2xl">{title}</h3>
      {meta ? <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#77766e]">{meta}</p> : null}
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#555750]">{children}</p>
    </article>
  );
}
