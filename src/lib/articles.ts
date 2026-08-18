import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Article, ArticleDocument } from "@/types";

const articlesDirectory = path.join(process.cwd(), "content", "articles");
const safeSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return readString(value);
}

function readTags(value: unknown) {
  return Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === "string")
    : [];
}

function metadataFromMatter(
  slug: string,
  data: Record<string, unknown>,
): Article {
  const createdAt = readDate(data.createdAt);

  if (!readString(data.title) || !readString(data.summary) || !createdAt) {
    throw new Error(`Article "${slug}" is missing required frontmatter.`);
  }

  return {
    id: readString(data.id, slug),
    slug,
    title: readString(data.title),
    summary: readString(data.summary),
    cover: readString(data.cover) || undefined,
    tags: readTags(data.tags),
    createdAt,
    updatedAt: readDate(data.updatedAt) || undefined,
  };
}

export async function getAllArticles(): Promise<Article[]> {
  let fileNames: string[];

  try {
    fileNames = await fs.readdir(articlesDirectory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const articles = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(".md"))
      .map(async (fileName) => {
        const slug = fileName.replace(/\.md$/, "");
        if (!safeSlugPattern.test(slug)) return null;
        const source = await fs.readFile(
          path.join(articlesDirectory, fileName),
          "utf8",
        );
        const { data } = matter(source);
        return metadataFromMatter(slug, data);
      }),
  );

  return articles
    .filter((article): article is Article => article !== null)
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    );
}

export async function getArticleBySlug(
  slug: string,
): Promise<ArticleDocument | null> {
  if (!safeSlugPattern.test(slug)) return null;

  try {
    const source = await fs.readFile(
      path.join(articlesDirectory, `${slug}.md`),
      "utf8",
    );
    const { data, content } = matter(source);
    return { ...metadataFromMatter(slug, data), content };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
