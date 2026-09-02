import "server-only";

import { projects } from "@/data/projects";
import { projectCoverUrl } from "@/lib/project/local-storage";
import { parseProjectVideoUrl } from "@/lib/project/video";
import type { Project, ProjectViewModel } from "@/types";

function toViewModel(project: Project): ProjectViewModel {
  const coverVideo = typeof project.coverFile === "string"
    ? parseProjectVideoUrl(project.coverFile)
    : null;
  const coverFiles = typeof project.coverFile === "string"
    ? coverVideo ? [] : [project.coverFile]
    : project.coverFile ?? [];

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    tags: [...(project.tags ?? [])],
    projectDate: project.projectDate,
    projectUrl: project.projectUrl,
    githubUrl: project.githubUrl,
    coverMedia: coverVideo ? [{
      type: "video",
      provider: coverVideo.provider,
      sourceUrl: coverVideo.sourceUrl,
      embedUrl: coverVideo.embedUrl,
    }] : coverFiles.flatMap((coverFile) => {
      const coverUrl = projectCoverUrl(`projects/${coverFile}`);
      return coverUrl ? [{ type: "image" as const, url: coverUrl }] : [];
    }),
  };
}

export function getPublishedProjects(): ProjectViewModel[] {
  return projects
    .filter((project) => project.published !== false)
    .map(toViewModel);
}
