import Link from "next/link";
import { SafeImage } from "@/components/common/SafeImage";
import { ProjectCoverCarousel } from "@/components/public/ProjectCoverCarousel";
import styles from "@/components/public/PublicSite.module.css";
import { formatProjectPeriod } from "@/lib/format";
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
        {project.coverUrls.length > 1 ? (
          <ProjectCoverCarousel
            title={project.title}
            urls={project.coverUrls}
            fallbackIndex={index}
          />
        ) : (
          <SafeImage
            src={project.coverUrls[0]}
            alt={`${project.title}封面`}
            sizes="(min-width: 1200px) 50vw, (min-width: 768px) 45vw, 80vw"
            ratio="wide"
            fallbackIndex={index}
          />
        )}
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
            {formatProjectPeriod(project.projectDate)}
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
