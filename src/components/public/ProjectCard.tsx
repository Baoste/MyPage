import Link from "next/link";
import { SafeImage } from "@/components/common/SafeImage";
import { formatDate } from "@/lib/format";
import type { ProjectViewModel } from "@/types";

interface ProjectCardProps {
  project: ProjectViewModel;
  index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  return (
    <article className="group min-w-0 border-t border-[#bdb8ac] pt-3">
      <div className="mb-3 flex items-center justify-between text-[0.66rem] font-semibold uppercase tracking-[0.15em] text-[#77766e]">
        <span>Project {String(index + 1).padStart(2, "0")}</span>
        {project.projectDate ? (
          <time dateTime={project.projectDate}>
            {formatDate(project.projectDate, { year: "numeric", month: "short" })}
          </time>
        ) : null}
      </div>

      <SafeImage
        src={project.coverUrl}
        alt={`${project.title} cover`}
        sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw"
      />

      <div className="pt-5">
        <h3 className="display-type text-[1.65rem] leading-tight">{project.title}</h3>
        {project.description ? (
          <p className="mt-3 text-sm leading-6 text-[#62635c]">
            {project.description}
          </p>
        ) : null}
        <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1" aria-label="Project tags">
          {project.tags.map((tag) => (
            <li key={tag} className="text-[0.68rem] uppercase tracking-[0.12em] text-[#77766e]">
              {tag}
            </li>
          ))}
        </ul>
        {project.projectUrl || project.githubUrl ? (
          <div className="mt-5 flex gap-4 text-xs font-semibold uppercase tracking-[0.1em]">
            {project.projectUrl ? (
              <Link href={project.projectUrl} target="_blank" rel="noreferrer">
                Visit ↗
              </Link>
            ) : null}
            {project.githubUrl ? (
              <Link href={project.githubUrl} target="_blank" rel="noreferrer">
                Source ↗
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
