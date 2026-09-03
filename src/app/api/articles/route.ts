import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  ARTICLE_COVER_MAXIMUM_BYTES,
  ArticleCoverStorageError,
  deleteLocalArticleCover,
  writeLocalArticleCover,
} from "@/lib/article/local-storage";
import {
  clearArticlePublishAttempts,
  consumeArticlePublishAttempt,
  isArticlePublishConfigured,
  verifyArticlePublishPassword,
} from "@/lib/article-publish";
import { hasValidRequestOrigin, requestClientKey } from "@/lib/auth/request";
import { ArticleServiceError, createArticle } from "@/services/articleService";
import type { ArticleCreateInput } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMUM_METADATA_BYTES = 256 * 1_024;
const MAXIMUM_MULTIPART_OVERHEAD_BYTES = 64 * 1_024;
const MAXIMUM_REQUEST_BYTES = ARTICLE_COVER_MAXIMUM_BYTES
  + MAXIMUM_METADATA_BYTES
  + MAXIMUM_MULTIPART_OVERHEAD_BYTES;

function jsonError(message: string, status: number, retryAfterSeconds?: number) {
  const response = NextResponse.json(
    { ok: false, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
  if (retryAfterSeconds) response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

export async function POST(request: NextRequest) {
  if (!request.headers.get("origin") || !hasValidRequestOrigin(request)) {
    return jsonError("请求已被拒绝。", 403);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAXIMUM_REQUEST_BYTES) {
    return jsonError("文章内容或封面过大。", 413);
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) {
    return jsonError("请求内容格式不正确。", 415);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("请求内容格式不正确。", 400);
  }

  const password = formData.get("password");
  const title = formData.get("title");
  const summary = formData.get("summary");
  const content = formData.get("content");
  const tagsValue = formData.get("tags");
  const cover = formData.get("cover");
  let tags: unknown;
  try {
    tags = typeof tagsValue === "string" ? JSON.parse(tagsValue) : null;
  } catch {
    tags = null;
  }

  if (
    typeof password !== "string"
    || password.length === 0
    || new TextEncoder().encode(password).byteLength > 72
    || typeof title !== "string"
    || typeof summary !== "string"
    || typeof content !== "string"
    || !Array.isArray(tags)
    || !tags.every((tag) => typeof tag === "string")
    || !(cover instanceof File)
    || cover.size === 0
  ) {
    return jsonError("请完整填写文章内容、封面和发布密码。", 400);
  }
  const metadataBytes = new TextEncoder().encode(
    `${title}\n${summary}\n${content}\n${tagsValue}`,
  ).byteLength;
  if (metadataBytes > MAXIMUM_METADATA_BYTES) {
    return jsonError("文章内容过大。", 413);
  }
  if (cover.size > ARTICLE_COVER_MAXIMUM_BYTES) {
    return jsonError("文章封面不能超过 10 MB。", 413);
  }

  if (!isArticlePublishConfigured()) {
    return jsonError("文章发布密码尚未配置。", 503);
  }

  const clientKey = `article-publish:${requestClientKey(request)}`;
  const attempt = consumeArticlePublishAttempt(clientKey);
  if (!attempt.allowed) {
    return jsonError("尝试次数过多，请稍后再试。", 429, attempt.retryAfterSeconds);
  }
  if (!(await verifyArticlePublishPassword(password))) {
    return jsonError("发布密码不正确。", 401);
  }
  clearArticlePublishAttempts(clientKey);

  let storedCover: Awaited<ReturnType<typeof writeLocalArticleCover>> | null = null;
  try {
    const coverBytes = new Uint8Array(await cover.arrayBuffer());
    storedCover = await writeLocalArticleCover(coverBytes, cover.type.toLowerCase());
    const article = await createArticle({
      title,
      summary,
      content,
      tags,
      coverUrl: storedCover.url,
    } satisfies ArticleCreateInput);
    revalidatePath("/");
    revalidatePath("/articles");
    return NextResponse.json(
      { ok: true, article: { slug: article.slug } },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (storedCover) {
      await deleteLocalArticleCover(storedCover.storagePath).catch((cleanupError) => {
        console.error("Unable to remove an unused article cover.", cleanupError);
      });
    }
    if (error instanceof ArticleCoverStorageError) {
      return jsonError(error.message, error.status);
    }
    if (error instanceof ArticleServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error("Unexpected article publishing error.", error);
    return jsonError("文章发布失败，请稍后再试。", 500);
  }
}
