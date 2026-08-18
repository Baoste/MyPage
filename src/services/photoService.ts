import "server-only";

import { requirePrivateSession } from "@/lib/auth/session";
import { isServerSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPrivateSignedUrl } from "@/lib/supabase/storage";
import {
  createPhotoActivityStats,
  daysBetween,
  unavailablePhotoActivity,
} from "@/lib/tree/activity";
import type {
  PhotoActivityStats,
  PhotoEntry,
  PhotoEntryRow,
  PhotoViewModel,
} from "@/types";

function mapPhoto(row: PhotoEntryRow): PhotoEntry {
  return {
    id: row.id,
    storagePath: row.storage_path,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    date: row.photo_date,
    location: row.location ?? undefined,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function toViewModel(photo: PhotoEntry): Promise<PhotoViewModel> {
  return { ...photo, imageUrl: await getPrivateSignedUrl(photo.storagePath) };
}

export async function getPhotoEntries(): Promise<PhotoViewModel[]> {
  await requirePrivateSession();
  if (!isServerSupabaseConfigured()) return [];

  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_entries")
    .select("*")
    .order("photo_date", { ascending: false });

  if (error) throw new Error("Unable to load photos.");
  return Promise.all(((data ?? []) as PhotoEntryRow[]).map(mapPhoto).map(toViewModel));
}

export async function getPhotoEntryById(
  id: string,
): Promise<PhotoViewModel | null> {
  await requirePrivateSession();
  if (!isServerSupabaseConfigured()) return null;

  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("Unable to load the photo.");
  return data ? toViewModel(mapPhoto(data as PhotoEntryRow)) : null;
}

export async function getPhotoActivityStats(
  now = new Date(),
): Promise<PhotoActivityStats> {
  await requirePrivateSession();
  if (!isServerSupabaseConfigured()) return { ...unavailablePhotoActivity };

  try {
    const client = createServerSupabaseClient();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
    const [recentResult, latestResult] = await Promise.all([
      client
        .from("photo_entries")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo),
      client
        .from("photo_entries")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (recentResult.error || latestResult.error) {
      console.error("Unable to calculate private photo activity.", {
        recent: recentResult.error?.code,
        latest: latestResult.error?.code,
      });
      return { ...unavailablePhotoActivity };
    }

    const latest = latestResult.data as { created_at?: unknown } | null;
    const latestTimestamp =
      latest && typeof latest.created_at === "string" ? new Date(latest.created_at) : null;
    const hasValidLatestTimestamp =
      latestTimestamp !== null && Number.isFinite(latestTimestamp.getTime());
    const daysSinceLastUpload = hasValidLatestTimestamp
      ? daysBetween(now, latestTimestamp)
      : null;

    return createPhotoActivityStats(recentResult.count ?? 0, daysSinceLastUpload);
  } catch (error) {
    console.error(
      "Unable to initialize private photo activity.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return { ...unavailablePhotoActivity };
  }
}
