import "server-only";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isPublicSupabaseConfigured } from "@/lib/supabase/config";

export const PUBLIC_ASSET_BUCKET = "public-assets";
export const PRIVATE_DIARY_BUCKET = "private-diary";

const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/webp", [".webp"]],
]);

function cleanStoragePath(storagePath: string) {
  const path = storagePath.replace(/^\/+/, "");
  if (!path || path.includes("..")) {
    throw new Error("Invalid storage object path.");
  }
  return path;
}

function signedUrlTtl() {
  const configured = Number.parseInt(
    process.env.PRIVATE_MEDIA_SIGNED_URL_TTL_SECONDS ?? "",
    10,
  );

  return Number.isInteger(configured) && configured >= 60 && configured <= 3600
    ? configured
    : DEFAULT_SIGNED_URL_TTL_SECONDS;
}

function validateImageUpload(
  storagePath: string,
  body: ArrayBuffer,
  contentType: string,
) {
  const extensions = allowedTypes.get(contentType);
  if (!extensions) throw new Error("Unsupported image MIME type.");
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Image exceeds the 10 MB upload limit.");
  }

  const normalized = storagePath.toLowerCase();
  if (!extensions.some((extension) => normalized.endsWith(extension))) {
    throw new Error("Image extension does not match its MIME type.");
  }
}

export function getPublicAssetUrl(storagePath: string): string | undefined {
  if (!isPublicSupabaseConfigured()) return undefined;

  const client = createPublicSupabaseClient();
  const { data } = client.storage
    .from(PUBLIC_ASSET_BUCKET)
    .getPublicUrl(cleanStoragePath(storagePath));

  return data.publicUrl;
}

export async function getPrivateSignedUrl(storagePath: string) {
  const client = createServerSupabaseClient();
  const { data, error } = await client.storage
    .from(PRIVATE_DIARY_BUCKET)
    .createSignedUrl(cleanStoragePath(storagePath), signedUrlTtl());

  if (error || !data?.signedUrl) {
    throw new Error("Unable to create a private media URL.");
  }

  return data.signedUrl;
}

async function uploadImage(
  bucket: typeof PUBLIC_ASSET_BUCKET | typeof PRIVATE_DIARY_BUCKET,
  storagePath: string,
  body: ArrayBuffer,
  contentType: string,
) {
  const path = cleanStoragePath(storagePath);
  validateImageUpload(path, body, contentType);
  const client = createServerSupabaseClient();
  const { error } = await client.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: false,
  });

  if (error) throw new Error("Unable to upload media.");
}

export async function uploadPublicAsset(
  storagePath: string,
  body: ArrayBuffer,
  contentType: string,
) {
  await uploadImage(PUBLIC_ASSET_BUCKET, storagePath, body, contentType);
}

export async function uploadPrivateAsset(
  storagePath: string,
  body: ArrayBuffer,
  contentType: string,
) {
  await uploadImage(PRIVATE_DIARY_BUCKET, storagePath, body, contentType);
}

export async function createPrivateSignedUploadUrl(
  storagePath: string,
  options: { upsert?: boolean } = {},
) {
  const path = cleanStoragePath(storagePath);
  const client = createServerSupabaseClient();
  const { data, error } = await client.storage
    .from(PRIVATE_DIARY_BUCKET)
    .createSignedUploadUrl(path, { upsert: options.upsert ?? false });

  if (error || !data?.signedUrl) {
    throw new Error("Unable to create a private upload URL.");
  }

  return { path, signedUrl: data.signedUrl, token: data.token };
}

export async function deletePrivateAssets(storagePaths: string[]) {
  if (storagePaths.length === 0) return;
  const paths = [...new Set(storagePaths.map(cleanStoragePath))];
  const client = createServerSupabaseClient();
  const { error } = await client.storage.from(PRIVATE_DIARY_BUCKET).remove(paths);
  if (error) throw new Error("Unable to delete private media.");
}

export async function deleteAsset(
  bucket: typeof PUBLIC_ASSET_BUCKET | typeof PRIVATE_DIARY_BUCKET,
  storagePath: string,
) {
  const client = createServerSupabaseClient();
  const { error } = await client.storage
    .from(bucket)
    .remove([cleanStoragePath(storagePath)]);

  if (error) throw new Error("Unable to delete media.");
}
