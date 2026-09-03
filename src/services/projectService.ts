import "server-only";

import { projects } from "@/data/projects";
import { projectCoverUrl } from "@/lib/project/local-storage";
import { parseProjectVideoUrl } from "@/lib/project/video";
import type {
  Project,
  ProjectCoverMedia,
  ProjectCoverMediaGroup,
  ProjectViewModel,
} from "@/types";

function getCoverSourceGroups(coverFile: Project["coverFile"]): string[][] {
  if (!coverFile) return [];
  if (typeof coverFile === "string") return [[coverFile]];

  return coverFile.map((entry) => (
    typeof entry === "string" ? [entry] : [...entry]
  ));
}

function toCoverMedia(coverSource: string): ProjectCoverMedia | null {
  const coverVideo = parseProjectVideoUrl(coverSource);
  if (coverVideo) {
    return {
      type: "video",
      provider: coverVideo.provider,
      sourceUrl: coverVideo.sourceUrl,
      embedUrl: coverVideo.embedUrl,
    };
  }

  const coverUrl = projectCoverUrl(`projects/${coverSource}`);
  return coverUrl ? { type: "image", url: coverUrl } : null;
}

function toViewModel(project: Project): ProjectViewModel {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    tags: [...(project.tags ?? [])],
    projectDate: project.projectDate,
    projectUrl: project.projectUrl,
    githubUrl: project.githubUrl,
    paperUrl: project.paperUrl,
    coverMedia: getCoverSourceGroups(project.coverFile)
      .map<ProjectCoverMediaGroup>((group) => group.flatMap((coverSource) => {
        const media = toCoverMedia(coverSource);
        return media ? [media] : [];
      }))
      .filter((group) => group.length > 0),
  };
}

export function getPublishedProjects(): ProjectViewModel[] {
  return projects
    .filter((project) => project.published !== false)
    .map(toViewModel);
}
