import type { Project } from "@/types";

const PROJECT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PROJECT_COVER_FILE_PATTERN = /^[a-z0-9][a-z0-9._-]{0,159}\.(?:jpe?g|png|webp)$/iu;
const PROJECT_PERIOD_PATTERN = /^(\d{4})-(0[1-9]|1[0-2]) - (\d{4})-(0[1-9]|1[0-2])$/u;

function projectError(projectId: string, message: string): never {
  throw new Error(`Invalid local project "${projectId}": ${message}`);
}

function validateProjectPeriod(projectId: string, value?: string) {
  if (!value) return;
  const match = PROJECT_PERIOD_PATTERN.exec(value);
  if (!match) {
    projectError(projectId, "projectDate must use YYYY-MM - YYYY-MM format.");
  }

  const startMonth = Number(match[1]) * 12 + Number(match[2]);
  const endMonth = Number(match[3]) * 12 + Number(match[4]);
  if (startMonth > endMonth) {
    projectError(projectId, "projectDate start month cannot be after its end month.");
  }
}

function validateUrl(projectId: string, label: string, value?: string) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      projectError(projectId, `${label} must use http:// or https://.`);
    }
  } catch {
    projectError(projectId, `${label} is not a valid URL.`);
  }
}

export function defineProjects(items: readonly Project[]): readonly Project[] {
  const ids = new Set<string>();
  const coverFiles = new Set<string>();

  for (const project of items) {
    const projectId = project.id || "unknown";
    if (!PROJECT_ID_PATTERN.test(project.id) || project.id.length > 80) {
      projectError(projectId, "id must be a kebab-case value up to 80 characters.");
    }
    if (ids.has(project.id)) projectError(projectId, "id must be unique.");
    ids.add(project.id);

    if (!project.title.trim() || project.title !== project.title.trim() || project.title.length > 160) {
      projectError(projectId, "title must contain 1–160 characters without surrounding spaces.");
    }
    if (project.description !== undefined && project.description !== project.description.trim()) {
      projectError(projectId, "description cannot contain surrounding spaces.");
    }

    const projectCoverFiles = typeof project.coverFile === "string"
      ? [project.coverFile]
      : project.coverFile ?? [];
    if (Array.isArray(project.coverFile) && project.coverFile.length === 0) {
      projectError(projectId, "coverFile list cannot be empty.");
    }
    if (projectCoverFiles.length > 8) {
      projectError(projectId, "coverFile supports at most 8 images per project.");
    }
    for (const coverFile of projectCoverFiles) {
      if (!PROJECT_COVER_FILE_PATTERN.test(coverFile)) {
        projectError(projectId, "coverFile must contain safe JPEG, PNG, or WebP filenames.");
      }
      const normalizedCoverFile = coverFile.toLowerCase();
      if (coverFiles.has(normalizedCoverFile)) {
        projectError(projectId, `cover file "${coverFile}" must not be used more than once.`);
      }
      coverFiles.add(normalizedCoverFile);
    }

    validateProjectPeriod(projectId, project.projectDate);
    validateUrl(projectId, "projectUrl", project.projectUrl);
    validateUrl(projectId, "githubUrl", project.githubUrl);

    const tags = project.tags ?? [];
    const normalizedTags = new Set<string>();
    for (const tag of tags) {
      if (!tag.trim() || tag !== tag.trim()) {
        projectError(projectId, "tags cannot be empty or contain surrounding spaces.");
      }
      const normalizedTag = tag.toLowerCase();
      if (normalizedTags.has(normalizedTag)) {
        projectError(projectId, `tag "${tag}" is duplicated.`);
      }
      normalizedTags.add(normalizedTag);
    }
  }

  return items;
}
