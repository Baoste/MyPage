import type { Project } from "@/types";

const timestamp = "2026-08-01T00:00:00.000Z";

export const mockProjects: Project[] = [
  {
    id: "mock-editorial-system",
    title: "Editorial System",
    description:
      "A calm publishing experience shaped around strong hierarchy and comfortable reading.",
    tags: ["Product design", "Frontend"],
    projectDate: "2026-05-01",
    sortOrder: 1,
    isPublished: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: "mock-archive-tool",
    title: "Personal Archive",
    description:
      "A private, searchable home for the small notes and images that usually get lost.",
    tags: ["Next.js", "Supabase"],
    projectDate: "2026-02-01",
    sortOrder: 2,
    isPublished: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: "mock-quiet-interface",
    title: "Quiet Interface Study",
    description:
      "An exploration of restrained motion, useful whitespace, and durable interface patterns.",
    tags: ["Interface", "Research"],
    projectDate: "2025-11-01",
    sortOrder: 3,
    isPublished: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];
