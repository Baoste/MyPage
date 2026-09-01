import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const TOOL_MODULES = {
  "story-editor": {
    deletePassword: "8812345",
  },
} as const;

export type ToolModuleId = keyof typeof TOOL_MODULES;

interface StoredModuleData {
  updatedAt: string;
  data: unknown;
}

export class ToolModuleError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ToolModuleError";
  }
}

function moduleConfig(id: string) {
  if (!(id in TOOL_MODULES)) throw new ToolModuleError("工具模块不存在。", 404);
  return TOOL_MODULES[id as ToolModuleId];
}

function storageRoot() {
  return path.resolve(
    /* turbopackIgnore: true */
    process.env.TOOLS_STORAGE_ROOT?.trim() || path.join(process.cwd(), ".data", "tools"),
  );
}

function containedPath(root: string, ...segments: string[]) {
  const target = path.resolve(root, ...segments);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ToolModuleError("工具模块路径配置无效。", 500);
  }
  return target;
}

function moduleDataDirectory(id: ToolModuleId) {
  return containedPath(storageRoot(), id);
}

function tombstonePath(id: ToolModuleId) {
  return containedPath(storageRoot(), ".deleted", `${id}.json`);
}

function sourceDirectory(id: ToolModuleId) {
  const sourceRoot = path.resolve(process.cwd(), "tool-modules");
  return containedPath(sourceRoot, id);
}

export function isToolModuleDeleted(id: ToolModuleId) {
  return existsSync(tombstonePath(id));
}

export function getToolModuleState(id: ToolModuleId) {
  const entry = path.join(process.cwd(), "tool-modules", id, "index.html");
  const deleted = isToolModuleDeleted(id);
  return { available: !deleted && existsSync(entry), deleted };
}

export async function readToolModuleEntry(idValue: string) {
  moduleConfig(idValue);
  const id = idValue as ToolModuleId;
  if (isToolModuleDeleted(id)) throw new ToolModuleError("工具模块已删除。", 410);
  try {
    return await readFile(containedPath(sourceDirectory(id), "index.html"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ToolModuleError("工具模块不存在。", 404);
    }
    throw new ToolModuleError("暂时无法加载工具模块。", 500);
  }
}

export async function readToolModuleData(idValue: string): Promise<StoredModuleData> {
  moduleConfig(idValue);
  const id = idValue as ToolModuleId;
  if (isToolModuleDeleted(id)) throw new ToolModuleError("工具模块已删除。", 410);
  const filePath = containedPath(moduleDataDirectory(id), "data.json");
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as StoredModuleData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new ToolModuleError("暂时无法读取工具数据。", 500);
    }
    return { updatedAt: "", data: null };
  }
}

export async function writeToolModuleData(idValue: string, data: unknown) {
  moduleConfig(idValue);
  const id = idValue as ToolModuleId;
  if (isToolModuleDeleted(id)) throw new ToolModuleError("工具模块已删除。", 410);
  const directory = moduleDataDirectory(id);
  await mkdir(directory, { recursive: true });
  const filePath = containedPath(directory, "data.json");
  const temporaryPath = containedPath(directory, `data.${randomUUID()}.tmp`);
  const stored: StoredModuleData = { updatedAt: new Date().toISOString(), data };
  await writeFile(temporaryPath, JSON.stringify(stored), { encoding: "utf8", flag: "wx" });
  await rename(temporaryPath, filePath);
  return stored;
}

export async function deleteToolModule(idValue: string, password: unknown) {
  const config = moduleConfig(idValue);
  const id = idValue as ToolModuleId;
  if (typeof password !== "string" || password !== config.deletePassword) {
    throw new ToolModuleError("删除口令不正确。", 403);
  }

  await rm(moduleDataDirectory(id), { recursive: true, force: true });
  const tombstone = tombstonePath(id);
  await mkdir(path.dirname(tombstone), { recursive: true });
  await writeFile(tombstone, JSON.stringify({ deletedAt: new Date().toISOString() }), "utf8");

  let sourceDeleted = false;
  try {
    const target = sourceDirectory(id);
    await rm(target, { recursive: true, force: true });
    sourceDeleted = !existsSync(target);
  } catch (error) {
    console.error("Unable to remove immutable tool module source.", {
      module: id,
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }

  return { sourceDeleted, disabled: true, dataDeleted: true };
}
