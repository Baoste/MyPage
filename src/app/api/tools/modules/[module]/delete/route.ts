import { NextRequest, NextResponse } from "next/server";
import { toolApiError, toolModuleError } from "@/app/api/tools/modules/_shared";
import { hasValidRequestOrigin, requestClientKey } from "@/lib/auth/request";
import {
  clearToolDeleteAttempts,
  consumeToolDeleteAttempt,
} from "@/lib/tools/delete-rate-limit";
import { deleteToolModule } from "@/lib/tools/module-store";

export const dynamic = "force-dynamic";
type ToolDeleteContext = { params: Promise<{ module: string }> };

export async function POST(request: NextRequest, context: ToolDeleteContext) {
  if (!request.headers.get("origin") || !hasValidRequestOrigin(request)) {
    return toolApiError("请求已被拒绝。", 403);
  }
  const clientKey = `tools-delete:${requestClientKey(request)}`;
  const attempt = consumeToolDeleteAttempt(clientKey);
  if (!attempt.allowed) {
    return toolApiError("尝试次数过多，请稍后再试。", 429, attempt.retryAfterSeconds);
  }

  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 1_024) {
      return toolApiError("请求内容过大。", 413);
    }
    const body = JSON.parse(text) as { password?: unknown };
    const { module } = await context.params;
    const result = await deleteToolModule(module, body.password);
    clearToolDeleteAttempts(clientKey);
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof SyntaxError) return toolApiError("请求内容格式不正确。", 400);
    return toolModuleError(error);
  }
}
