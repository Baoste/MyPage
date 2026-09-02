import Link from "next/link";
import { SafeImage } from "@/components/common/SafeImage";
import { ProjectCoverCarousel } from "@/components/public/ProjectCoverCarousel";
import { ProjectCoverVideo } from "@/components/public/ProjectCoverVideo";
import styles from "@/components/public/PublicSite.module.css";
import { formatProjectPeriod } from "@/lib/format";
import type { ProjectViewModel } from "@/types";

interface ProjectCardProps {
  project: ProjectViewModel;
  index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  const videoCover = project.coverMedia.find((cover) => cover.type === "video");
  const imageUrls = project.coverMedia.flatMap((cover) => (
    cover.type === "image" ? [cover.url] : []
  ));

  return (
    <article className={`${styles.projectCard} group`}>
      <div className={styles.projectNumber} aria-hidden="true">
        <span>{String(index + 1).padStart(2, "0")}</span>
      </div>

      <div className={styles.projectMedia}>
        {videoCover ? (
          <ProjectCoverVideo title={project.title} video={videoCover} />
        ) : imageUrls.length > 1 ? (
          <ProjectCoverCarousel
            title={project.title}
            urls={imageUrls}
            fallbackIndex={index}
          />
        ) : (
          <SafeImage
            src={imageUrls[0]}
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
