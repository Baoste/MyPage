import { EmptyState } from "@/components/common/EmptyState";
import { ProjectCard } from "@/components/public/ProjectCard";
import type { ProjectViewModel } from "@/types";

export function ProjectGallery({ projects }: { projects: ProjectViewModel[] }) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet."
        message="Published work will appear here when it is ready."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} />
      ))}
    </div>
  );
}
