import "server-only";

import { randomUUID } from "node:crypto";
import {
  CALENDAR_MAX_IMAGES, CALENDAR_MAX_NOTE_LENGTH, CALENDAR_MAX_SOURCES, CALENDAR_MAX_TEXT_LENGTH, CALENDAR_TIMEZONE,
  type CalendarAssetRole, type CalendarDayPayload, type CalendarDaySource, type CalendarEntryView,
  type CalendarLayout, type CalendarMonthDay, isCalendarDate, isCalendarMonth,
  parseCalendarLayout,
} from "@/lib/calendar/contracts";
import { generateCalendarJournal, isCalendarAiAvailable } from "@/lib/calendar/ai";
import { foodThumbnailStoragePath, getLocalFoodFileInfo, isLocalFoodStoragePath, readLocalFoodFile } from "@/lib/food/local-storage";
import { getLocalPhotoFileInfo, isLocalPhotoStoragePath, photoThumbnailStoragePath, readLocalPhotoFile } from "@/lib/photo/local-storage";
import { isServerSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deletePrivateAssets, downloadPrivateAsset, uploadPrivateAsset } from "@/lib/supabase/storage";

export class CalendarServiceError extends Error { constructor(message: string, public status = 500) { super(message); } }
type EntryRow = { id: string; owner_user_id: string; entry_date: string; status: CalendarEntryView["status"]; user_note: string; generated_text: string; final_text: string; layout_json: unknown; updated_at: string; last_error: string | null };
type AssetRow = { id: string; calendar_entry_id: string; role: CalendarAssetRole; storage_path: string; mime_type: string; width: number; height: number; byte_size: number; sort_order: number };

function ensureConfigured() { if (!isServerSupabaseConfigured()) throw new CalendarServiceError("日历数据库尚未配置。", 503); }
function missingSchema(error: { code?: string; message?: string }) { return error.code === "42P01" || error.message?.includes("calendar_entries"); }
function nextDate(date: string) { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + 1); return value.toISOString().slice(0, 10); }
function range(date: string) { return { start: `${date}T00:00:00+08:00`, end: `${nextDate(date)}T00:00:00+08:00` }; }
function monthEnd(month: string) { const [year, value] = month.split("-").map(Number); const date = new Date(Date.UTC(year, value, 1)); return date.toISOString().slice(0, 7) + "-01"; }
function assetUrl(id: string) { return `/api/private/calendar/assets/${id}/file`; }

function mapEntry(row: EntryRow, assets: AssetRow[]): CalendarEntryView {
  const layout = row.layout_json && Object.keys(row.layout_json as object).length ? parseCalendarLayout(row.layout_json) : null;
  return { id: row.id, date: row.entry_date, status: row.status, userNote: row.user_note, generatedText: row.generated_text, finalText: row.final_text, layout,
    assets: assets.map((asset) => ({ id: asset.id, role: asset.role, url: assetUrl(asset.id), width: asset.width, height: asset.height, sortOrder: asset.sort_order })),
    updatedAt: row.updated_at, lastError: row.last_error ?? undefined };
}

async function entriesWithAssets(userId: string, start: string, end: string) {
  const client = createServerSupabaseClient();
  const { data, error } = await client.from("calendar_entries").select("id,owner_user_id,entry_date,status,user_note,generated_text,final_text,layout_json,updated_at,last_error").eq("owner_user_id", userId).gte("entry_date", start).lt("entry_date", end);
  if (error) { if (missingSchema(error)) throw new CalendarServiceError("请先执行 Calendar 数据库 Migration。", 503); throw new CalendarServiceError("无法读取手账。", 500); }
  const rows = (data ?? []) as EntryRow[];
  if (!rows.length) return [];
  const { data: assets, error: assetError } = await client.from("calendar_assets").select("*").in("calendar_entry_id", rows.map((row) => row.id)).order("sort_order");
  if (assetError) throw new CalendarServiceError("无法读取手账资源。", 500);
  return rows.map((row) => mapEntry(row, ((assets ?? []) as AssetRow[]).filter((asset) => asset.calendar_entry_id === row.id)));
}

export async function getCalendarMonth(userId: string, month: string): Promise<CalendarMonthDay[]> {
  if (!isCalendarMonth(month)) throw new CalendarServiceError("月份格式无效。", 400);
  ensureConfigured();
  const startDate = `${month}-01`, endDate = monthEnd(month);
  const start = `${startDate}T00:00:00+08:00`, end = `${endDate}T00:00:00+08:00`;
  const client = createServerSupabaseClient();
  const [photos, foods, entries] = await Promise.all([
    client.from("photo_entries").select("occurred_at").eq("status", "ready").gte("occurred_at", start).lt("occurred_at", end),
    client.from("food_entries").select("occurred_at").eq("status", "ready").gte("occurred_at", start).lt("occurred_at", end),
    entriesWithAssets(userId, startDate, endDate),
  ]);
  if (photos.error || foods.error) throw new CalendarServiceError("无法聚合本月素材。", 500);
  const days = new Map<string, CalendarMonthDay>();
  const touch = (date: string) => { const current = days.get(date) ?? { date, photoCount: 0, foodCount: 0, entry: null }; days.set(date, current); return current; };
  for (const row of photos.data ?? []) touch(new Intl.DateTimeFormat("en-CA", { timeZone: CALENDAR_TIMEZONE }).format(new Date(row.occurred_at))).photoCount++;
  for (const row of foods.data ?? []) touch(new Intl.DateTimeFormat("en-CA", { timeZone: CALENDAR_TIMEZONE }).format(new Date(row.occurred_at))).foodCount++;
  for (const entry of entries) touch(entry.date).entry = entry;
  return [...days.values()];
}

export async function getLatestCalendarContentMonth(userId: string) {
  ensureConfigured();
  const client = createServerSupabaseClient();
  const [photo, food, entry] = await Promise.all([
    client.from("photo_entries").select("occurred_at").eq("status", "ready").order("occurred_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("food_entries").select("occurred_at").eq("status", "ready").order("occurred_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("calendar_entries").select("entry_date").eq("owner_user_id", userId).order("entry_date", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const dates = [photo.data?.occurred_at, food.data?.occurred_at, entry.data?.entry_date]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.includes("T")
      ? new Intl.DateTimeFormat("en-CA", { timeZone: CALENDAR_TIMEZONE }).format(new Date(value))
      : value)
    .sort((a, b) => b.localeCompare(a));
  return dates[0]?.slice(0, 7) ?? null;
}

async function getEntry(userId: string, date: string) { return (await entriesWithAssets(userId, date, nextDate(date)))[0] ?? null; }

export async function getCalendarDay(userId: string, date: string): Promise<CalendarDayPayload> {
  if (!isCalendarDate(date)) throw new CalendarServiceError("日期格式无效。", 400);
  ensureConfigured(); const client = createServerSupabaseClient(); const { start, end } = range(date);
  const [photoResult, foodResult] = await Promise.all([
    client.from("photo_entries").select("id,title,description,occurred_at").eq("status", "ready").gte("occurred_at", start).lt("occurred_at", end).order("occurred_at"),
    client.from("food_entries").select("id,category,review,rating,location_city_name,occurred_at").eq("status", "ready").gte("occurred_at", start).lt("occurred_at", end).order("occurred_at"),
  ]);
  if (photoResult.error || foodResult.error) throw new CalendarServiceError("无法读取当天素材。", 500);
  const photoIds = (photoResult.data ?? []).map((row) => row.id), foodIds = (foodResult.data ?? []).map((row) => row.id);
  const [photoComments, foodComments, foodImages] = await Promise.all([
    photoIds.length ? client.from("photo_comments").select("id,photo_entry_id,author_username,content").in("photo_entry_id", photoIds).order("created_at") : Promise.resolve({ data: [], error: null }),
    foodIds.length ? client.from("food_comments").select("id,food_entry_id,author_username,content").in("food_entry_id", foodIds).order("created_at") : Promise.resolve({ data: [], error: null }),
    foodIds.length ? client.from("food_images").select("id,food_entry_id").in("food_entry_id", foodIds).order("sort_order") : Promise.resolve({ data: [], error: null }),
  ]);
  const sources: CalendarDaySource[] = [
    ...(photoResult.data ?? []).map((row) => ({ id: row.id, type: "photo" as const, title: row.title || "一张照片", description: row.description || "", occurredAt: row.occurred_at, imageIds: [row.id], imageUrls: [`/api/private/photos/images/${row.id}/file?variant=thumbnail`], comments: (photoComments.data ?? []).filter((item) => item.photo_entry_id === row.id).map((item) => ({ id: item.id, author: item.author_username, content: item.content })) })),
    ...(foodResult.data ?? []).map((row) => { const images = (foodImages.data ?? []).filter((item) => item.food_entry_id === row.id); return { id: row.id, type: "food" as const, title: row.category || "一顿饭", description: [row.location_city_name, row.rating ? `${row.rating}/5` : "", row.review].filter(Boolean).join(" · "), occurredAt: row.occurred_at, imageIds: images.map((item) => item.id), imageUrls: images.map((item) => `/api/private/food/images/${item.id}/file?variant=thumbnail`), comments: (foodComments.data ?? []).filter((item) => item.food_entry_id === row.id).map((item) => ({ id: item.id, author: item.author_username, content: item.content })) }; }),
  ].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  return { date, sources, entry: await getEntry(userId, date), aiAvailable: isCalendarAiAvailable() };
}

async function sourceImage(type: "photo" | "food", imageId: string) {
  const client = createServerSupabaseClient();
  const table = type === "photo" ? "photo_entries" : "food_images";
  const { data, error } = await client.from(table).select("storage_path,mime_type").eq("id", imageId).single();
  if (error || !data) throw new CalendarServiceError("所选图片不存在。", 400);
  try {
    if (type === "photo" && isLocalPhotoStoragePath(data.storage_path)) {
      const thumbnailPath = photoThumbnailStoragePath(data.storage_path);
      const storagePath = await getLocalPhotoFileInfo(thumbnailPath) ? thumbnailPath : data.storage_path;
      const bytes = await readLocalPhotoFile(storagePath);
      return { bytes: new Uint8Array(bytes), mimeType: data.mime_type as string };
    }
    if (type === "food" && isLocalFoodStoragePath(data.storage_path)) {
      const thumbnailPath = foodThumbnailStoragePath(data.storage_path);
      const storagePath = await getLocalFoodFileInfo(thumbnailPath) ? thumbnailPath : data.storage_path;
      const bytes = await readLocalFoodFile(storagePath);
      return { bytes: new Uint8Array(bytes), mimeType: data.mime_type as string };
    }
    const bytes = await downloadPrivateAsset(data.storage_path);
    return { bytes: new Uint8Array(bytes), mimeType: data.mime_type as string };
  } catch {
    throw new CalendarServiceError("无法读取所选图片。", 409);
  }
}

export async function generateEntry(userId: string, date: string, sourceIds: string[], imageIds: string[], userNote: string) {
  if (!isCalendarDate(date) || !Array.isArray(sourceIds) || sourceIds.length < 1 || sourceIds.length > CALENDAR_MAX_SOURCES) throw new CalendarServiceError("请选择 1～12 条当天素材。", 400);
  if (!Array.isArray(imageIds) || imageIds.length > CALENDAR_MAX_IMAGES || new Set(imageIds).size !== imageIds.length) throw new CalendarServiceError("最多选择 8 张不重复的图片。", 400);
  if (typeof userNote !== "string" || Array.from(userNote).length > CALENDAR_MAX_NOTE_LENGTH) throw new CalendarServiceError("补充文字不能超过 2000 字。", 400);
  if (!isCalendarAiAvailable()) throw new CalendarServiceError("Calendar AI 尚未配置。", 503);
  const day = await getCalendarDay(userId, date); const selected = day.sources.filter((source) => sourceIds.includes(`${source.type}:${source.id}`));
  if (!selected.length || selected.length !== new Set(sourceIds).size) throw new CalendarServiceError("所选素材无效或不属于当天。", 400);
  const selectableImages = new Set(selected.flatMap((source) => source.imageIds));
  if (!imageIds.every((imageId) => selectableImages.has(imageId))) throw new CalendarServiceError("所选图片无效或不属于已选素材。", 400);
  const client = createServerSupabaseClient();
  const previous = await client.from("calendar_entries").select("*").eq("owner_user_id", userId).eq("entry_date", date).maybeSingle();
  const selectedImageSet = new Set(imageIds);
  const manifest = { version: 1, sources: selected.map((source) => ({ type: source.type, id: source.id, imageIds: source.imageIds.filter((imageId) => selectedImageSet.has(imageId)), comments: source.comments })) };
  const { data: entryData, error: entryError } = await client.from("calendar_entries").upsert({ owner_user_id: userId, entry_date: date, timezone: CALENDAR_TIMEZONE, status: "generating", user_note: userNote.trim(), source_manifest: manifest, last_error: null }, { onConflict: "owner_user_id,entry_date" }).select("id").single();
  if (entryError || !entryData) throw new CalendarServiceError("无法创建生成任务。", 500);
  try {
    const context = selected.map((source) => `${source.type === "photo" ? "照片" : "美食"}：${source.title}。${source.description}。评论：${source.comments.map((item) => `${item.author}: ${item.content}`).join("；")}`).join("\n") + (userNote.trim() ? `\n用户补充：${userNote.trim()}` : "");
    const imageRefs = selected.flatMap((source) => source.imageIds.filter((id) => selectedImageSet.has(id)).map((id) => ({ type: source.type, id })));
    const images = await Promise.all(imageRefs.map((image) => sourceImage(image.type, image.id)));
    const result = await generateCalendarJournal(context, images);
    const old = await client.from("calendar_assets").select("*").eq("calendar_entry_id", entryData.id).in("role", ["cover", "sticker"]);
    const newAssets = [{ role: "cover" as const, ...result.cover }, ...result.stickers.map((item) => ({ role: "sticker" as const, ...item }))];
    const rows: Array<Record<string, unknown>> = [];
    for (const [index, asset] of newAssets.entries()) { const id = randomUUID(); const path = `calendar/${userId}/${entryData.id}/${id}.png`; await uploadPrivateAsset(path, asset.bytes.buffer.slice(asset.bytes.byteOffset, asset.bytes.byteOffset + asset.bytes.byteLength) as ArrayBuffer, asset.mimeType); rows.push({ id, calendar_entry_id: entryData.id, role: asset.role, storage_path: path, mime_type: asset.mimeType, width: 1024, height: 1024, byte_size: asset.bytes.byteLength, sort_order: index }); }
    await client.from("calendar_assets").delete().eq("calendar_entry_id", entryData.id).in("role", ["cover", "sticker"]);
    const { error: assetError } = await client.from("calendar_assets").insert(rows);
    if (assetError) { if (old.data?.length) await client.from("calendar_assets").insert(old.data); throw assetError; }
    const coverId = rows[0].id as string, stickerIds = rows.slice(1).map((row) => row.id as string);
    const layout: CalendarLayout = { version: 1, canvas: { aspectRatio: 1 }, cover: { assetId: coverId, cropX: .5, cropY: .5, scale: 1 }, dateNumber: { color: "#ffffff", font: "morganite" }, text: { x: .08, y: .67, width: .84, rotation: 0, zIndex: 10, style: { align: "left", color: "#ffffff", font: "aventa" } }, stickers: stickerIds.map((assetId, index) => ({ assetId, x: .68 - index * .12, y: .08 + index * .1, width: .24, rotation: index % 2 ? 8 : -8, zIndex: 20 + index })) };
    await client.from("calendar_entries").update({ status: "draft", generated_text: result.text, final_text: result.text, layout_json: layout, generation_meta: result.meta, last_error: null }).eq("id", entryData.id).eq("owner_user_id", userId);
    if (old.data?.length) await deletePrivateAssets(old.data.map((item) => item.storage_path)).catch(() => undefined);
    return getEntry(userId, date);
  } catch (error) {
    const lastError = error instanceof Error ? error.message.slice(0, 1000) : "生成失败";
    if (previous.data) {
      const old = previous.data;
      await client.from("calendar_entries").update({ status: old.status, user_note: old.user_note, generated_text: old.generated_text, final_text: old.final_text, source_manifest: old.source_manifest, layout_json: old.layout_json, generation_meta: old.generation_meta, last_error: lastError }).eq("id", entryData.id).eq("owner_user_id", userId);
    } else {
      await client.from("calendar_entries").update({ status: "failed", last_error: lastError }).eq("id", entryData.id).eq("owner_user_id", userId);
    }
    if (error instanceof CalendarServiceError) throw error;
    throw new CalendarServiceError(error instanceof Error ? error.message : "AI 生成失败。", 502);
  }
}

export async function saveEntry(userId: string, id: string, finalText: unknown, layoutValue: unknown, updatedAt: unknown) {
  if (typeof finalText !== "string" || Array.from(finalText).length > CALENDAR_MAX_TEXT_LENGTH) throw new CalendarServiceError("手账文字不能超过 4000 字。", 400);
  const layout = parseCalendarLayout(layoutValue); const client = createServerSupabaseClient();
  const { data: assets } = await client.from("calendar_assets").select("id").eq("calendar_entry_id", id);
  const ownedIds = new Set((assets ?? []).map((asset) => asset.id));
  if (![layout.cover.assetId, ...layout.stickers.map((item) => item.assetId)].every((assetId) => ownedIds.has(assetId))) throw new CalendarServiceError("布局引用了无效资源。", 400);
  let query = client.from("calendar_entries").update({ final_text: finalText.trim(), layout_json: layout, status: "ready", last_error: null }).eq("id", id).eq("owner_user_id", userId);
  if (typeof updatedAt === "string") query = query.eq("updated_at", updatedAt);
  const { data, error } = await query.select("entry_date").maybeSingle();
  if (error) throw new CalendarServiceError("无法保存手账。", 500); if (!data) throw new CalendarServiceError("手账已在其他页面更新，请刷新后重试。", 409);
  return getEntry(userId, data.entry_date);
}

export async function savePreview(userId: string, id: string, bytes: ArrayBuffer, mimeType: string, role: "preview" | "thumbnail" = "preview") {
  const expectedMimeType = role === "preview" ? "image/png" : "image/webp";
  const maximumBytes = role === "preview" ? 5 * 1024 * 1024 : 1024 * 1024;
  if (mimeType !== expectedMimeType || bytes.byteLength < 1 || bytes.byteLength > maximumBytes) throw new CalendarServiceError(role === "preview" ? "预览图必须是 5 MB 以内的 PNG。" : "日历缩略图必须是 1 MB 以内的 WebP。", 400);
  const client = createServerSupabaseClient(); const entry = await client.from("calendar_entries").select("id").eq("id", id).eq("owner_user_id", userId).maybeSingle();
  if (!entry.data) throw new CalendarServiceError("手账不存在。", 404);
  const old = await client.from("calendar_assets").select("*").eq("calendar_entry_id", id).eq("role", role).maybeSingle();
  const assetId = randomUUID(), extension = role === "preview" ? "png" : "webp", path = `calendar/${userId}/${id}/${assetId}.${extension}`; await uploadPrivateAsset(path, bytes, mimeType);
  if (old.data) await client.from("calendar_assets").delete().eq("id", old.data.id);
  const dimension = role === "preview" ? 1024 : 256;
  const { error } = await client.from("calendar_assets").insert({ id: assetId, calendar_entry_id: id, role, storage_path: path, mime_type: mimeType, width: dimension, height: dimension, byte_size: bytes.byteLength, sort_order: 0 });
  if (error) {
    if (old.data) await client.from("calendar_assets").insert(old.data);
    await deletePrivateAssets([path]).catch(() => undefined);
    throw new CalendarServiceError(role === "preview" ? "无法保存预览图。" : "无法保存日历缩略图，请先执行最新 Calendar Migration。", 500);
  }
  if (old.data) await deletePrivateAssets([old.data.storage_path]).catch(() => undefined);
}

export async function readCalendarAsset(userId: string, id: string) {
  const client = createServerSupabaseClient(); const { data, error } = await client.from("calendar_assets").select("storage_path,mime_type,byte_size,calendar_entries!inner(owner_user_id)").eq("id", id).eq("calendar_entries.owner_user_id", userId).maybeSingle();
  if (error || !data) throw new CalendarServiceError("资源不存在。", 404);
  return { bytes: await downloadPrivateAsset(data.storage_path), mimeType: data.mime_type, byteSize: data.byte_size };
}

export async function deleteEntry(userId: string, id: string) {
  const client = createServerSupabaseClient(); const assets = await client.from("calendar_assets").select("storage_path,calendar_entries!inner(owner_user_id)").eq("calendar_entry_id", id).eq("calendar_entries.owner_user_id", userId);
  const { data, error } = await client.from("calendar_entries").delete().eq("id", id).eq("owner_user_id", userId).select("id").maybeSingle();
  if (error) throw new CalendarServiceError("无法删除手账。", 500); if (!data) throw new CalendarServiceError("手账不存在。", 404);
  await deletePrivateAssets((assets.data ?? []).map((asset) => asset.storage_path)).catch(() => undefined);
}
