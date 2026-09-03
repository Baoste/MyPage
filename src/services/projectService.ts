import "server-only";

import { projects } from "@/data/projects";
import { projectCoverUrl } from "@/lib/project/local-storage";
import { parseProjectVideoUrl } from "@/lib/project/video";
import type { Project, ProjectCoverMedia, ProjectViewModel } from "@/types";

function toViewModel(project: Project): ProjectViewModel {
  const coverSources = typeof project.coverFile === "string"
    ? [project.coverFile]
    : project.coverFile ?? [];

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    tags: [...(project.tags ?? [])],
    projectDate: project.projectDate,
    projectUrl: project.projectUrl,
    githubUrl: project.githubUrl,
    coverMedia: coverSources.flatMap<ProjectCoverMedia>((coverSource) => {
      const coverVideo = parseProjectVideoUrl(coverSource);
      if (coverVideo) {
        return [{
          type: "video" as const,
          provider: coverVideo.provider,
          sourceUrl: coverVideo.sourceUrl,
          embedUrl: coverVideo.embedUrl,
        }];
      }

      const coverUrl = projectCoverUrl(`projects/${coverSource}`);
      return coverUrl ? [{ type: "image" as const, url: coverUrl }] : [];
    }),
  };
}

export function getPublishedProjects(): ProjectViewModel[] {
  return projects
    .filter((project) => project.published !== false)
    .map(toViewModel);
}
