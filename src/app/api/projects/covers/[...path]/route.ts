import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import {
  getLocalProjectCoverFile,
  ProjectCoverStorageError,
} from "@/lib/project/local-storage";

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
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const storagePath = path.join("/");

  try {
    const file = await getLocalProjectCoverFile(storagePath);
    if (!file) return errorResponse("Project cover not found.", 404);

    const etag = `"project-cover-${file.size}-${Math.trunc(file.modifiedAtMs)}"`;
    const cacheHeaders = {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400, no-transform",
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
    if (error instanceof ProjectCoverStorageError) {
      return errorResponse(error.message, error.status);
    }
    console.error("Unable to serve a local project cover.", { storagePath, error });
    return errorResponse("Unable to read project cover.", 500);
  }
}
