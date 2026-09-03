import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";
import { isServerSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Article,
  ArticleCreateInput,
  ArticleDocument,
  ArticleRow,
  ArticleSummaryRow,
} from "@/types";

const SAFE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_COVER_URL_PATTERN = /^\/api\/articles\/covers\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/iu;
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

const ARTICLE_SUMMARY_COLUMNS = "id,slug,title,summary,cover_url,tags,is_published,published_at,created_at,updated_at";
const ARTICLE_DOCUMENT_COLUMNS = `${ARTICLE_SUMMARY_COLUMNS},content`;
const LEGACY_ARTICLE_SUMMARY_COLUMNS = "id,slug,title,summary,tags,is_published,published_at,created_at,updated_at";
const LEGACY_ARTICLE_DOCUMENT_COLUMNS = `${LEGACY_ARTICLE_SUMMARY_COLUMNS},content`;

function mapArticle(row: ArticleSummaryRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverUrl: row.cover_url ?? undefined,
    tags: row.tags ?? [],
    createdAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

function mapArticleDocument(row: ArticleRow): ArticleDocument {
  return { ...mapArticle(row), content: row.content };
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
  const tags = [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))];
  if (tags.length > MAXIMUM_TAGS) {
    throw new ArticleServiceError(`标签不能超过 ${MAXIMUM_TAGS} 个。`, 400);
  }
  if (tags.some((tag) => tag.length > MAXIMUM_TAG_CHARACTERS)) {
    throw new ArticleServiceError(`每个标签不能超过 ${MAXIMUM_TAG_CHARACTERS} 个字符。`, 400);
  }
  if (!SAFE_COVER_URL_PATTERN.test(input.coverUrl)) {
    throw new ArticleServiceError("文章封面地址无效。", 400);
  }

  return {
    title: normalizeRequiredText(input.title, "标题", MAXIMUM_TITLE_CHARACTERS),
    summary: normalizeRequiredText(input.summary, "摘要", MAXIMUM_SUMMARY_CHARACTERS),
    content: normalizeRequiredText(input.content, "正文", MAXIMUM_CONTENT_CHARACTERS),
    tags,
    coverUrl: input.coverUrl,
  };
}

interface ArticleDatabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

function isMissingCoverColumnError(error: ArticleDatabaseError | null) {
  if (!error || !["42703", "PGRST204"].includes(error.code ?? "")) return false;
  return [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes("cover_url");
}

function isMissingArticleSchemaError(error: ArticleDatabaseError | null) {
  return Boolean(error?.code && ["42P01", "PGRST200", "PGRST204", "PGRST205"].includes(error.code));
}

async function readPublishedArticles(maximum?: number): Promise<Article[]> {
  if (!isServerSupabaseConfigured()) return [];

  const client = createServerSupabaseClient();
  const runQuery = async (columns: string) => {
    let query = client
      .from("articles")
      .select(columns)
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .order("id", { ascending: false });
    if (maximum !== undefined) query = query.limit(maximum);
    return query;
  };
  let result = await runQuery(ARTICLE_SUMMARY_COLUMNS);
  if (isMissingCoverColumnError(result.error)) {
    result = await runQuery(LEGACY_ARTICLE_SUMMARY_COLUMNS);
    if (!result.error) {
      return ((result.data ?? []) as unknown as Omit<ArticleSummaryRow, "cover_url">[])
        .map((row) => mapArticle({ ...row, cover_url: null }));
    }
  }

  if (result.error) {
    if (isMissingArticleSchemaError(result.error)) return [];
    throw new ArticleServiceError("文章暂时无法读取。", 503);
  }

  return ((result.data ?? []) as unknown as ArticleSummaryRow[]).map(mapArticle);
}

export const getAllArticles = cache(async () => readPublishedArticles());

export const getLatestArticles = cache(async (maximum = 6) => {
  const safeMaximum = Number.isFinite(maximum)
    ? Math.min(12, Math.max(1, Math.trunc(maximum)))
    : 6;
  return readPublishedArticles(safeMaximum);
});

export const getArticleBySlug = cache(async (slugValue: string): Promise<ArticleDocument | null> => {
  const slug = slugValue.trim().toLowerCase();
  if (!SAFE_SLUG_PATTERN.test(slug) || !isServerSupabaseConfigured()) return null;

  const client = createServerSupabaseClient();
  const runQuery = (columns: string) => client
    .from("articles")
    .select(columns)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  let result = await runQuery(ARTICLE_DOCUMENT_COLUMNS);
  if (isMissingCoverColumnError(result.error)) {
    result = await runQuery(LEGACY_ARTICLE_DOCUMENT_COLUMNS);
    if (!result.error && result.data) {
      return mapArticleDocument({
        ...(result.data as unknown as Omit<ArticleRow, "cover_url">),
        cover_url: null,
      });
    }
  }

  if (result.error) {
    if (isMissingArticleSchemaError(result.error)) return null;
    throw new ArticleServiceError("文章暂时无法读取。", 503);
  }

  return result.data ? mapArticleDocument(result.data as unknown as ArticleRow) : null;
});

export async function createArticle(input: ArticleCreateInput): Promise<ArticleDocument> {
  if (!isServerSupabaseConfigured()) {
    throw new ArticleServiceError("文章数据库尚未配置。", 503);
  }

  const normalized = normalizeCreateInput(input);
  const client = createServerSupabaseClient();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await client
      .from("articles")
      .insert({
        slug: randomUUID(),
        title: normalized.title,
        summary: normalized.summary,
        content: normalized.content,
        tags: normalized.tags,
        cover_url: normalized.coverUrl,
        is_published: true,
      })
      .select(ARTICLE_DOCUMENT_COLUMNS)
      .single();

    if (!error) return mapArticleDocument(data as unknown as ArticleRow);
    if (error.code === "23505") continue;
    if (isMissingArticleSchemaError(error)) {
      throw new ArticleServiceError("Articles 数据库迁移尚未执行。", 503);
    }
    throw new ArticleServiceError("文章发布失败，请稍后再试。", 500);
  }

  throw new ArticleServiceError("暂时无法生成唯一文章地址，请重新发布。", 503);
}
