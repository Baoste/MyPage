import "server-only";

import { stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

const MAX_PROJECT_COVER_BYTES = 10 * 1024 * 1024;
const PROJECT_COVER_PATH_PATTERN = /^projects\/[a-z0-9][a-z0-9._-]{0,159}\.(?:jpe?g|png|webp)$/iu;

const MIME_TYPE_BY_EXTENSION = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);

export interface LocalProjectCoverFile {
  absolutePath: string;
  mimeType: string;
  modifiedAtMs: number;
  size: number;
}

export class ProjectCoverStorageError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ProjectCoverStorageError";
  }
}

export function projectCoverStorageRoot() {
  const configuredRoot = process.env.PROJECT_COVER_STORAGE_ROOT?.trim();
  if (configuredRoot) return resolve(/*turbopackIgnore: true*/ configuredRoot);
  return resolve(process.cwd(), ".data", "public-assets");
}

export function isLocalProjectCoverPath(storagePath: string) {
  return PROJECT_COVER_PATH_PATTERN.test(storagePath);
}

export function projectCoverUrl(storagePath: string): string | undefined {
  if (!isLocalProjectCoverPath(storagePath)) return undefined;
  const encodedPath = storagePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `/api/projects/covers/${encodedPath}`;
}

function resolveLocalProjectCoverPath(storagePath: string) {
  if (!isLocalProjectCoverPath(storagePath)) {
    throw new ProjectCoverStorageError("Invalid project cover path.", 400);
  }

  const root = projectCoverStorageRoot();
  const absolutePath = resolve(root, ...storagePath.split("/"));
  const relativePath = relative(root, absolutePath);
  if (
    !relativePath
    || relativePath === ".."
    || relativePath.startsWith(`..${sep}`)
    || isAbsolute(relativePath)
  ) {
    throw new ProjectCoverStorageError("Project cover path escapes the configured root.", 400);
  }
  return absolutePath;
}

function isMissingFile(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export async function getLocalProjectCoverFile(
  storagePath: string,
): Promise<LocalProjectCoverFile | null> {
  const absolutePath = resolveLocalProjectCoverPath(storagePath);
  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) return null;
    if (fileStat.size > MAX_PROJECT_COVER_BYTES) {
      throw new ProjectCoverStorageError("Project cover exceeds the 10 MB limit.", 413);
    }

    const extension = storagePath.slice(storagePath.lastIndexOf(".") + 1).toLowerCase();
    const mimeType = MIME_TYPE_BY_EXTENSION.get(extension);
    if (!mimeType) throw new ProjectCoverStorageError("Unsupported project cover type.", 415);

    return {
      absolutePath,
      mimeType,
      modifiedAtMs: fileStat.mtimeMs,
      size: fileStat.size,
    };
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}
