import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { imageDimensionsFromBytes, imageSignatureMatches } from "@/lib/food/image-headers";

export const ARTICLE_COVER_MAXIMUM_BYTES = 10 * 1024 * 1024;

const MAXIMUM_COVER_PIXELS = 40_000_000;
const UUID_PATH_PART = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const ARTICLE_COVER_PATH_PATTERN = new RegExp(
  `^articles\\/${UUID_PATH_PART}\\.(?:jpg|png|webp)$`,
  "iu",
);

const MIME_TYPE_BY_EXTENSION = new Map([
  ["jpg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);

const EXTENSION_BY_MIME_TYPE = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export interface LocalArticleCoverFile {
  absolutePath: string;
  mimeType: string;
  modifiedAtMs: number;
  size: number;
}

export interface StoredArticleCover {
  storagePath: string;
  url: string;
}

export class ArticleCoverStorageError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ArticleCoverStorageError";
  }
}

export function articleCoverStorageRoot() {
  const configuredRoot = process.env.ARTICLE_COVER_STORAGE_ROOT?.trim()
    || process.env.PROJECT_COVER_STORAGE_ROOT?.trim();
  if (configuredRoot) return resolve(/*turbopackIgnore: true*/ configuredRoot);
  return resolve(process.cwd(), ".data", "public-assets");
}

export function isLocalArticleCoverPath(storagePath: string) {
  return ARTICLE_COVER_PATH_PATTERN.test(storagePath);
}

export function articleCoverUrl(storagePath: string) {
  if (!isLocalArticleCoverPath(storagePath)) {
    throw new ArticleCoverStorageError("Invalid article cover path.", 400);
  }
  const filename = storagePath.slice("articles/".length);
  return `/api/articles/covers/${encodeURIComponent(filename)}`;
}

export function articleCoverStoragePathFromFilename(filename: string) {
  const storagePath = `articles/${filename}`;
  return isLocalArticleCoverPath(storagePath) ? storagePath : null;
}

function resolveLocalArticleCoverPath(storagePath: string) {
  if (!isLocalArticleCoverPath(storagePath)) {
    throw new ArticleCoverStorageError("Invalid article cover path.", 400);
  }

  const root = articleCoverStorageRoot();
  const absolutePath = resolve(root, ...storagePath.split("/"));
  const relativePath = relative(root, absolutePath);
  if (
    !relativePath
    || relativePath === ".."
    || relativePath.startsWith(`..${sep}`)
    || isAbsolute(relativePath)
  ) {
    throw new ArticleCoverStorageError("Article cover path escapes the configured root.", 400);
  }
  return absolutePath;
}

function isMissingFile(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function extensionForMimeType(mimeType: string) {
  const extension = EXTENSION_BY_MIME_TYPE.get(mimeType);
  if (!extension) {
    throw new ArticleCoverStorageError("封面只支持 JPEG、PNG 和 WebP 图片。", 415);
  }
  return extension;
}

function validateCoverBytes(bytes: Uint8Array, mimeType: string) {
  if (bytes.byteLength === 0) {
    throw new ArticleCoverStorageError("请选择文章封面。", 400);
  }
  if (bytes.byteLength > ARTICLE_COVER_MAXIMUM_BYTES) {
    throw new ArticleCoverStorageError("文章封面不能超过 10 MB。", 413);
  }
  if (!imageSignatureMatches(bytes, mimeType)) {
    throw new ArticleCoverStorageError("文章封面的文件内容与图片格式不匹配。", 415);
  }

  const dimensions = imageDimensionsFromBytes(bytes, mimeType);
  if (
    !dimensions
    || dimensions.width <= 0
    || dimensions.height <= 0
    || dimensions.width * dimensions.height > MAXIMUM_COVER_PIXELS
  ) {
    throw new ArticleCoverStorageError("文章封面尺寸无效或像素过大。", 400);
  }
}

export async function writeLocalArticleCover(bytes: Uint8Array, mimeType: string) {
  const extension = extensionForMimeType(mimeType);
  validateCoverBytes(bytes, mimeType);

  const storagePath = `articles/${randomUUID()}.${extension}`;
  const absolutePath = resolveLocalArticleCoverPath(storagePath);
  const temporaryPath = `${absolutePath}.${randomUUID()}.upload`;
  await mkdir(dirname(absolutePath), { recursive: true });
  try {
    await writeFile(temporaryPath, bytes, { flag: "wx" });
    await rename(temporaryPath, absolutePath);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }

  return {
    storagePath,
    url: articleCoverUrl(storagePath),
  } satisfies StoredArticleCover;
}

export async function deleteLocalArticleCover(storagePath: string) {
  if (!isLocalArticleCoverPath(storagePath)) return;
  await rm(resolveLocalArticleCoverPath(storagePath), { force: true });
}

export async function getLocalArticleCoverFile(
  storagePath: string,
): Promise<LocalArticleCoverFile | null> {
  const absolutePath = resolveLocalArticleCoverPath(storagePath);
  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) return null;
    if (fileStat.size > ARTICLE_COVER_MAXIMUM_BYTES) {
      throw new ArticleCoverStorageError("Article cover exceeds the 10 MB limit.", 413);
    }

    const extension = storagePath.slice(storagePath.lastIndexOf(".") + 1).toLowerCase();
    const mimeType = MIME_TYPE_BY_EXTENSION.get(extension);
    if (!mimeType) throw new ArticleCoverStorageError("Unsupported article cover type.", 415);
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
