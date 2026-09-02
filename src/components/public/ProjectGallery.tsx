import { EmptyState } from "@/components/common/EmptyState";
import { ProjectCard } from "@/components/public/ProjectCard";
import styles from "@/components/public/PublicSite.module.css";
import type { ProjectViewModel } from "@/types";

export function ProjectGallery({ projects }: { projects: ProjectViewModel[] }) {
  if (projects.length === 0) {
    return (
      <div className={styles.emptyState}>
        <EmptyState
          title="暂时还没有作品"
          message="准备完成后，已发布的作品会显示在这里。"
        />
      </div>
    );
  }

  return (
    <div className={styles.projectList}>
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} />
      ))}
    </div>
  );
}
