import Link from "next/link";
import { ProjectCoverGallery } from "@/components/public/ProjectCoverGallery";
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
      <div className={styles.projectMedia}>
        <ProjectCoverGallery
          title={project.title}
          media={project.coverMedia}
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
            {formatProjectPeriod(project.projectDate)}
          </p>
        ) : null}
        {project.projectUrl || project.githubUrl || project.paperUrl ? (
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
            {project.paperUrl ? (
              <Link className={`${styles.projectAction} ${styles.projectActionSecondary}`} href={project.paperUrl} target="_blank" rel="noreferrer">
                查看论文 <span aria-hidden="true">↗</span>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
