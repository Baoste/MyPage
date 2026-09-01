import { NextRequest, NextResponse } from "next/server";
import { toolApiError, toolModuleError } from "@/app/api/tools/modules/_shared";
import { hasValidRequestOrigin } from "@/lib/auth/request";
import { readToolModuleData, writeToolModuleData } from "@/lib/tools/module-store";

export const dynamic = "force-dynamic";
const MAXIMUM_DATA_BYTES = 12 * 1024 * 1024;
const EMPTY_STORY_BOARD = { world: "", places: {}, chars: {}, events: {}, mechs: {} };

type ToolDataContext = { params: Promise<{ module: string }> };

function validStoryBoardData(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.world !== "string") return false;
  return ["places", "chars", "events", "mechs"].every((key) => {
    const collection = record[key];
    return typeof collection === "object" && collection !== null && !Array.isArray(collection);
  });
}

export async function GET(_request: NextRequest, context: ToolDataContext) {
  const { module } = await context.params;
  try {
    const stored = await readToolModuleData(module);
    return NextResponse.json(
      {
        ok: true,
        data: stored.data ?? EMPTY_STORY_BOARD,
        updatedAt: stored.updatedAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return toolModuleError(error);
  }
}

export async function PUT(request: NextRequest, context: ToolDataContext) {
  if (!request.headers.get("origin") || !hasValidRequestOrigin(request)) {
    return toolApiError("请求已被拒绝。", 403);
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAXIMUM_DATA_BYTES) {
    return toolApiError("故事数据不能超过 12 MB。", 413);
  }

  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAXIMUM_DATA_BYTES) {
      return toolApiError("故事数据不能超过 12 MB。", 413);
    }
    const body = JSON.parse(text) as { data?: unknown };
    if (!validStoryBoardData(body.data)) return toolApiError("故事数据格式不正确。", 400);
    const { module } = await context.params;
    const stored = await writeToolModuleData(module, body.data);
    return NextResponse.json(
      { ok: true, updatedAt: stored.updatedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof SyntaxError) return toolApiError("故事数据格式不正确。", 400);
    return toolModuleError(error);
  }
}
