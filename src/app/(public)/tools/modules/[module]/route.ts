import { toolApiError } from "@/app/api/tools/modules/_shared";
import { readToolModuleEntry, ToolModuleError } from "@/lib/tools/module-store";

export const dynamic = "force-dynamic";

type ToolViewContext = { params: Promise<{ module: string }> };

export async function GET(_request: Request, context: ToolViewContext) {
  try {
    const { module } = await context.params;
    const html = await readToolModuleEntry(module);
    return new Response(html, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'unsafe-inline'",
          "style-src 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "connect-src 'self'",
          "font-src 'self'",
          "frame-ancestors 'self'",
          "base-uri 'none'",
          "object-src 'none'",
        ].join("; "),
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (error) {
    if (error instanceof ToolModuleError) return toolApiError(error.message, error.status);
    return toolApiError("工具模块暂时无法加载。", 500);
  }
}
