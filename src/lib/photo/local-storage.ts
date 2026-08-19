import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

const UUID_PATH_PART = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const LOCAL_PHOTO_PATH_PATTERN = new RegExp(
  `^photos\\/${UUID_PATH_PART}\\/${UUID_PATH_PART}\\.(?:jpg|png|webp)$`,
  "iu",
);

export interface LocalPhotoFileInfo {
  absolutePath: string;
  size: number;
}

export function photoStorageRoot() {
  const configuredRoot = process.env.PHOTO_STORAGE_ROOT?.trim()
    || process.env.FOOD_STORAGE_ROOT?.trim();
  if (configuredRoot) return resolve(/*turbopackIgnore: true*/ configuredRoot);
  return resolve(process.cwd(), ".data", "private-media");
}

export function isLocalPhotoStoragePath(storagePath: string) {
  return LOCAL_PHOTO_PATH_PATTERN.test(storagePath);
}

function resolveLocalPhotoPath(storagePath: string) {
  if (!isLocalPhotoStoragePath(storagePath)) throw new Error("Invalid local photo path.");
  const root = photoStorageRoot();
  const absolutePath = resolve(root, ...storagePath.split("/"));
  const relativePath = relative(root, absolutePath);
  if (
    !relativePath
    || relativePath === ".."
    || relativePath.startsWith(`..${sep}`)
    || isAbsolute(relativePath)
  ) throw new Error("Local photo path escapes the configured root.");
  return absolutePath;
}

function isMissingFile(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export async function getLocalPhotoFileInfo(
  storagePath: string,
): Promise<LocalPhotoFileInfo | null> {
  if (!isLocalPhotoStoragePath(storagePath)) return null;
  const absolutePath = resolveLocalPhotoPath(storagePath);
  try {
    const fileStat = await stat(absolutePath);
    return fileStat.isFile() ? { absolutePath, size: fileStat.size } : null;
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

export async function writeLocalPhotoFile(storagePath: string, bytes: Uint8Array) {
  const absolutePath = resolveLocalPhotoPath(storagePath);
  const parentDirectory = dirname(absolutePath);
  const temporaryPath = `${absolutePath}.${randomUUID()}.upload`;
  await mkdir(parentDirectory, { recursive: true });
  try {
    await writeFile(temporaryPath, bytes, { flag: "wx" });
    await rename(temporaryPath, absolutePath);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

export async function readLocalPhotoFile(storagePath: string) {
  return readFile(resolveLocalPhotoPath(storagePath));
}

export async function readLocalPhotoFileHeader(storagePath: string, maximumBytes: number) {
  const info = await getLocalPhotoFileInfo(storagePath);
  if (!info) return null;
  const length = Math.min(info.size, maximumBytes);
  const bytes = new Uint8Array(length);
  const handle = await open(info.absolutePath, "r");
  try {
    const { bytesRead } = await handle.read(bytes, 0, length, 0);
    return bytes.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

export async function deleteLocalPhotoFiles(storagePaths: string[]) {
  const uniquePaths = [...new Set(storagePaths.filter(isLocalPhotoStoragePath))];
  const emptiedDirectories = new Set<string>();
  for (const storagePath of uniquePaths) {
    const absolutePath = resolveLocalPhotoPath(storagePath);
    await rm(absolutePath, { force: true });
    emptiedDirectories.add(dirname(absolutePath));
  }
  for (const directory of emptiedDirectories) await rmdir(directory).catch(() => undefined);
}

