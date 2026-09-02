import Link from "next/link";
import { SafeImage } from "@/components/common/SafeImage";
import styles from "@/components/public/PublicSite.module.css";
import { formatDate } from "@/lib/format";
import type { ProjectViewModel } from "@/types";

interface ProjectCardProps {
  project: ProjectViewModel;
  index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  return (
    <article className={`${styles.projectCard} group`}>
      <div className={styles.projectNumber} aria-hidden="true">
        <span>{String(index + 1).padStart(2, "0")}</span>
      </div>

      <div className={styles.projectMedia}>
        <SafeImage
          src={project.coverUrl}
          alt={`${project.title}封面`}
          sizes="(min-width: 1200px) 50vw, (min-width: 768px) 45vw, 80vw"
          ratio="wide"
          fallbackIndex={index}
        />
      </div>

      <div className={styles.projectContent}>
        <ul className={styles.projectTags} aria-label="作品标签">
          {project.tags.map((tag) => (
            <li key={tag} className={styles.projectTag}>{tag}</li>
          ))}
        </ul>

        <h3 className={styles.projectTitle}>{project.title}</h3>
        {project.description ? (
          <p className={styles.projectDescription}>{project.description}</p>
        ) : null}
        {project.projectDate ? (
          <p className={styles.projectMeta}>
            <time dateTime={project.projectDate}>
              {formatDate(project.projectDate, { year: "numeric", month: "short" })}
            </time>
          </p>
        ) : null}
        {project.projectUrl || project.githubUrl ? (
          <div className={styles.projectActions}>
            {project.projectUrl ? (
              <Link className={styles.projectAction} href={project.projectUrl} target="_blank" rel="noreferrer">
                查看项目 <span aria-hidden="true">↗</span>
              </Link>
            ) : null}
            {project.githubUrl ? (
              <Link className={`${styles.projectAction} ${styles.projectActionSecondary}`} href={project.githubUrl} target="_blank" rel="noreferrer">
                查看源码 <span aria-hidden="true">↗</span>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
