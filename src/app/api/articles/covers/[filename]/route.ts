import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import {
  articleCoverStoragePathFromFilename,
  ArticleCoverStorageError,
  getLocalArticleCoverFile,
} from "@/lib/article/local-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: {
      "Cache-Control": "public, max-age=60",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  const storagePath = articleCoverStoragePathFromFilename(filename);
  if (!storagePath) return errorResponse("Article cover not found.", 404);

  try {
    const file = await getLocalArticleCoverFile(storagePath);
    if (!file) return errorResponse("Article cover not found.", 404);

    const etag = `"article-cover-${file.size}-${Math.trunc(file.modifiedAtMs)}"`;
    const cacheHeaders = {
      "Cache-Control": "public, max-age=31536000, immutable, no-transform",
      ETag: etag,
    };
    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders });
    }

    const body = Readable.toWeb(createReadStream(file.absolutePath)) as ReadableStream<Uint8Array>;
    return new NextResponse(body, {
      headers: {
        ...cacheHeaders,
        "Content-Disposition": "inline",
        "Content-Length": String(file.size),
        "Content-Type": file.mimeType,
        "Last-Modified": new Date(file.modifiedAtMs).toUTCString(),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ArticleCoverStorageError) {
      return errorResponse(error.message, error.status);
    }
    console.error("Unable to serve a local article cover.", { storagePath, error });
    return errorResponse("Unable to read article cover.", 500);
  }
}
