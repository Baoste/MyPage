import "server-only";

import { projects } from "@/data/projects";
import { projectCoverUrl } from "@/lib/project/local-storage";
import type { Project, ProjectViewModel } from "@/types";

function toViewModel(project: Project): ProjectViewModel {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    tags: [...(project.tags ?? [])],
    projectDate: project.projectDate,
    projectUrl: project.projectUrl,
    githubUrl: project.githubUrl,
    coverUrl: project.coverFile
      ? projectCoverUrl(`projects/${project.coverFile}`)
      : undefined,
  };
}

export function getPublishedProjects(): ProjectViewModel[] {
  return projects
    .filter((project) => project.published !== false)
    .map(toViewModel);
}
