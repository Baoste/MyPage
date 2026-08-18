import "server-only";

import { requirePrivateSession } from "@/lib/auth/session";
import { isServerSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPrivateSignedUrl } from "@/lib/supabase/storage";
import type { FoodEntry, FoodEntryRow, FoodViewModel } from "@/types";

function mapFood(row: FoodEntryRow): FoodEntry {
  return {
    id: row.id,
    name: row.name,
    storagePath: row.storage_path,
    description: row.description ?? undefined,
    restaurant: row.restaurant ?? undefined,
    location: row.location ?? undefined,
    rating: row.rating ?? undefined,
    date: row.food_date,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function toViewModel(food: FoodEntry): Promise<FoodViewModel> {
  return { ...food, imageUrl: await getPrivateSignedUrl(food.storagePath) };
}

export async function getFoodEntries(): Promise<FoodViewModel[]> {
  await requirePrivateSession();
  if (!isServerSupabaseConfigured()) return [];

  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("food_entries")
    .select("*")
    .order("food_date", { ascending: false });

  if (error) throw new Error("Unable to load food entries.");
  return Promise.all(((data ?? []) as FoodEntryRow[]).map(mapFood).map(toViewModel));
}

export async function getFoodEntryById(
  id: string,
): Promise<FoodViewModel | null> {
  await requirePrivateSession();
  if (!isServerSupabaseConfigured()) return null;

  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("food_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("Unable to load the food entry.");
  return data ? toViewModel(mapFood(data as FoodEntryRow)) : null;
}
