import type { Project } from "@/types";

const PROJECT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PROJECT_COVER_FILE_PATTERN = /^[a-z0-9][a-z0-9._-]{0,159}\.(?:jpe?g|png|webp)$/iu;
const PROJECT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function projectError(projectId: string, message: string): never {
  throw new Error(`Invalid local project "${projectId}": ${message}`);
}

function isValidDate(value: string) {
  if (!PROJECT_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
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

    if (project.coverFile) {
      if (!PROJECT_COVER_FILE_PATTERN.test(project.coverFile)) {
        projectError(projectId, "coverFile must be a safe JPEG, PNG, or WebP filename.");
      }
      const normalizedCoverFile = project.coverFile.toLowerCase();
      if (coverFiles.has(normalizedCoverFile)) {
        projectError(projectId, "coverFile must not be shared by another project.");
      }
      coverFiles.add(normalizedCoverFile);
    }

    if (project.projectDate && !isValidDate(project.projectDate)) {
      projectError(projectId, "projectDate must be a real date in YYYY-MM-DD format.");
    }
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
