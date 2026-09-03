import "server-only";

import { cache } from "react";
import { isServerSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Article,
  ArticleCreateInput,
  ArticleDocument,
  ArticleRow,
} from "@/types";

const SAFE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAXIMUM_TITLE_CHARACTERS = 160;
const MAXIMUM_SUMMARY_CHARACTERS = 500;
const MAXIMUM_CONTENT_CHARACTERS = 200_000;
const MAXIMUM_TAGS = 12;
const MAXIMUM_TAG_CHARACTERS = 32;

export class ArticleServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ArticleServiceError";
  }
}

function mapArticle(row: ArticleRow): ArticleDocument {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    content: row.content,
    tags: row.tags ?? [],
    createdAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

function normalizeRequiredText(value: string, label: string, maximum: number) {
  const normalized = value.trim();
  if (!normalized) throw new ArticleServiceError(`请填写${label}。`, 400);
  if (normalized.length > maximum) {
    throw new ArticleServiceError(`${label}不能超过 ${maximum} 个字符。`, 400);
  }
  return normalized;
}

function normalizeCreateInput(input: ArticleCreateInput): ArticleCreateInput {
  const slug = input.slug.trim().toLowerCase();
  if (!SAFE_SLUG_PATTERN.test(slug) || slug.length > 120) {
    throw new ArticleServiceError("Slug 只能包含小写字母、数字和单个连字符。", 400);
  }

  const tags = [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))];
  if (tags.length > MAXIMUM_TAGS) {
    throw new ArticleServiceError(`标签不能超过 ${MAXIMUM_TAGS} 个。`, 400);
  }
  if (tags.some((tag) => tag.length > MAXIMUM_TAG_CHARACTERS)) {
    throw new ArticleServiceError(`每个标签不能超过 ${MAXIMUM_TAG_CHARACTERS} 个字符。`, 400);
  }

  return {
    slug,
    title: normalizeRequiredText(input.title, "标题", MAXIMUM_TITLE_CHARACTERS),
    summary: normalizeRequiredText(input.summary, "摘要", MAXIMUM_SUMMARY_CHARACTERS),
    content: normalizeRequiredText(input.content, "正文", MAXIMUM_CONTENT_CHARACTERS),
    tags,
  };
}

function isMissingArticleSchemaError(error: { code?: string } | null) {
  return Boolean(error?.code && ["42P01", "PGRST200", "PGRST204", "PGRST205"].includes(error.code));
}

export const getAllArticles = cache(async (): Promise<Article[]> => {
  if (!isServerSupabaseConfigured()) return [];

  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("articles")
    .select("id,slug,title,summary,content,tags,is_published,published_at,created_at,updated_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    if (isMissingArticleSchemaError(error)) return [];
    throw new ArticleServiceError("文章暂时无法读取。", 503);
  }

  return ((data ?? []) as ArticleRow[]).map(mapArticle);
});

export const getArticleBySlug = cache(async (slugValue: string): Promise<ArticleDocument | null> => {
  const slug = slugValue.trim().toLowerCase();
  if (!SAFE_SLUG_PATTERN.test(slug) || !isServerSupabaseConfigured()) return null;

  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("articles")
    .select("id,slug,title,summary,content,tags,is_published,published_at,created_at,updated_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    if (isMissingArticleSchemaError(error)) return null;
    throw new ArticleServiceError("文章暂时无法读取。", 503);
  }

  return data ? mapArticle(data as ArticleRow) : null;
});

export async function createArticle(input: ArticleCreateInput): Promise<ArticleDocument> {
  if (!isServerSupabaseConfigured()) {
    throw new ArticleServiceError("文章数据库尚未配置。", 503);
  }

  const normalized = normalizeCreateInput(input);
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("articles")
    .insert({
      slug: normalized.slug,
      title: normalized.title,
      summary: normalized.summary,
      content: normalized.content,
      tags: normalized.tags,
      is_published: true,
    })
    .select("id,slug,title,summary,content,tags,is_published,published_at,created_at,updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ArticleServiceError("这个 Slug 已经被使用，请换一个。", 409);
    }
    if (isMissingArticleSchemaError(error)) {
      throw new ArticleServiceError("Articles 数据库迁移尚未执行。", 503);
    }
    throw new ArticleServiceError("文章发布失败，请稍后再试。", 500);
  }

  return mapArticle(data as ArticleRow);
}
