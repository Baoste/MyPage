import "server-only";

import { mockProjects } from "@/data/projects";
import { isPublicSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { getPublicAssetUrl } from "@/lib/supabase/storage";
import type { Project, ProjectRow, ProjectViewModel } from "@/types";

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    coverPath: row.cover_path ?? undefined,
    tags: row.tags ?? [],
    projectDate: row.project_date ?? undefined,
    projectUrl: row.project_url ?? undefined,
    githubUrl: row.github_url ?? undefined,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toViewModel(project: Project): ProjectViewModel {
  return {
    ...project,
    coverUrl: project.coverPath
      ? getPublicAssetUrl(project.coverPath)
      : undefined,
  };
}

export async function getPublishedProjects(): Promise<ProjectViewModel[]> {
  if (!isPublicSupabaseConfigured()) return mockProjects.map(toViewModel);

  const client = createPublicSupabaseClient();
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("project_date", { ascending: false, nullsFirst: false });

  if (error) throw new Error("Unable to load published projects.");
  return ((data ?? []) as ProjectRow[]).map(mapProject).map(toViewModel);
}
