export const CALENDAR_TIMEZONE = "Asia/Shanghai";
export const CALENDAR_ENTRY_ASPECT_RATIO = 1;
export const CALENDAR_MAX_NOTE_LENGTH = 2000;
export const CALENDAR_MAX_TEXT_LENGTH = 4000;
export const CALENDAR_MAX_SOURCES = 12;
export const CALENDAR_MAX_IMAGES = 8;

export type CalendarEntryStatus = "draft" | "generating" | "ready" | "failed";
export type CalendarAssetRole = "cover" | "sticker" | "preview";
export type CalendarSourceType = "photo" | "food";
export type CalendarTextFont = "aventa" | "morganite";

export interface CalendarAssetView { id: string; role: CalendarAssetRole; url: string; width: number; height: number; sortOrder: number; }
export interface CalendarLayout {
  version: 1;
  canvas: { aspectRatio: 1 };
  cover: { assetId: string; cropX: number; cropY: number; scale: number };
  text: { x: number; y: number; width: number; rotation: number; zIndex: number; style: { align: "left" | "center" | "right"; color: string; font: CalendarTextFont } };
  stickers: Array<{ assetId: string; x: number; y: number; width: number; rotation: number; zIndex: number }>;
}
export interface CalendarEntryView {
  id: string; date: string; status: CalendarEntryStatus; userNote: string; generatedText: string;
  finalText: string; layout: CalendarLayout | null; assets: CalendarAssetView[]; updatedAt: string; lastError?: string;
}
export interface CalendarMonthDay { date: string; photoCount: number; foodCount: number; entry: CalendarEntryView | null; }
export interface CalendarSourceComment { id: string; author: string; content: string; }
export interface CalendarDaySource {
  id: string; type: CalendarSourceType; title: string; description: string; occurredAt: string;
  imageIds: string[]; imageUrls: string[]; comments: CalendarSourceComment[];
}
export interface CalendarDayPayload { date: string; sources: CalendarDaySource[]; entry: CalendarEntryView | null; aiAvailable: boolean; }

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export function isCalendarMonth(value: string) { return /^\d{4}-(0[1-9]|1[0-2])$/u.test(value); }
function finiteBetween(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}
export function parseCalendarLayout(value: unknown): CalendarLayout {
  if (!value || typeof value !== "object") throw new Error("手账布局无效。");
  const layout = value as Partial<CalendarLayout>;
  if (layout.version !== 1 || layout.canvas?.aspectRatio !== CALENDAR_ENTRY_ASPECT_RATIO) throw new Error("手账画布必须使用 1:1 比例。");
  const cover = layout.cover, text = layout.text, stickers = layout.stickers;
  if (!cover || typeof cover.assetId !== "string" || !finiteBetween(cover.cropX, 0, 1) || !finiteBetween(cover.cropY, 0, 1) || !finiteBetween(cover.scale, 1, 4)) throw new Error("Cover 布局无效。");
  if (!text || !finiteBetween(text.x, 0, 1) || !finiteBetween(text.y, 0, 1) || !finiteBetween(text.width, .1, 1) || !finiteBetween(text.rotation, -180, 180) || !["left", "center", "right"].includes(text.style?.align) || !/^#[0-9a-f]{6}$/iu.test(text.style?.color ?? "")) throw new Error("文字布局无效。");
  if (!Array.isArray(stickers) || stickers.length > 12 || stickers.some((item) => !item || typeof item.assetId !== "string" || !finiteBetween(item.x, 0, 1) || !finiteBetween(item.y, 0, 1) || !finiteBetween(item.width, .05, 1) || !finiteBetween(item.rotation, -180, 180))) throw new Error("贴纸布局无效。");
  const font = text.style.font === "morganite" ? "morganite" : "aventa";
  return { ...layout, text: { ...text, style: { ...text.style, font } } } as CalendarLayout;
}
