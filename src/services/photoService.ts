import "server-only";

import { requirePrivateSession } from "@/lib/auth/session";
import { isServerSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPrivateSignedUrl } from "@/lib/supabase/storage";
import type { PhotoEntry, PhotoEntryRow, PhotoViewModel } from "@/types";

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
