import { NextResponse } from "next/server";
import { ToolModuleError } from "@/lib/tools/module-store";

export function toolApiError(message: string, status: number, retryAfterSeconds?: number) {
  const response = NextResponse.json(
    { ok: false, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
  if (retryAfterSeconds) response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

export function toolModuleError(error: unknown) {
  if (error instanceof ToolModuleError) return toolApiError(error.message, error.status);
  console.error("Unexpected Tools module error.", error);
  return toolApiError("工具模块暂时无法处理请求。", 500);
}
