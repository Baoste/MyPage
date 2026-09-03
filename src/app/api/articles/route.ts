import { NextRequest, NextResponse } from "next/server";
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

const MAXIMUM_REQUEST_BYTES = 256 * 1_024;

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
    return jsonError("文章内容过大。", 413);
  }

  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAXIMUM_REQUEST_BYTES) {
      return jsonError("文章内容过大。", 413);
    }
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonError("请求内容格式不正确。", 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError("请求内容格式不正确。", 400);
  }

  const { password, title, slug, summary, content, tags } = body;
  if (
    typeof password !== "string"
    || password.length === 0
    || password.length > 256
    || typeof title !== "string"
    || typeof slug !== "string"
    || typeof summary !== "string"
    || typeof content !== "string"
    || !Array.isArray(tags)
    || !tags.every((tag) => typeof tag === "string")
  ) {
    return jsonError("请完整填写文章内容和发布密码。", 400);
  }

  if (!isArticlePublishConfigured()) {
    return jsonError("文章发布密码尚未配置。", 503);
  }

  const clientKey = `article-publish:${requestClientKey(request)}`;
  const attempt = consumeArticlePublishAttempt(clientKey);
  if (!attempt.allowed) {
    return jsonError("尝试次数过多，请稍后再试。", 429, attempt.retryAfterSeconds);
  }
  if (!verifyArticlePublishPassword(password)) {
    return jsonError("发布密码不正确。", 401);
  }
  clearArticlePublishAttempts(clientKey);

  try {
    const article = await createArticle({
      title,
      slug,
      summary,
      content,
      tags,
    } satisfies ArticleCreateInput);
    return NextResponse.json(
      { ok: true, article: { slug: article.slug } },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ArticleServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error("Unexpected article publishing error.", error);
    return jsonError("文章发布失败，请稍后再试。", 500);
  }
}
