"use client";
/* eslint-disable @next/next/no-img-element -- authenticated same-origin media must remain canvas-readable */

import { startTransition, useEffect, useMemo, useRef, useState, ViewTransition } from "react";
import { CALENDAR_MAX_IMAGES, type CalendarDayPayload, type CalendarEntryView, type CalendarMonthDay, type CalendarTextFont } from "@/lib/calendar/contracts";
import styles from "./CalendarPage.module.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const JOURNAL_BLUR_SETTLE_MS = 720;
const FONT_FAMILIES: Record<CalendarTextFont, string> = {
  aventa: 'var(--font-aventa), "Microsoft YaHei", sans-serif',
  morganite: 'var(--font-morganite), "Microsoft YaHei", sans-serif',
  pingfang: 'var(--font-pingfang), "Microsoft YaHei", sans-serif',
  bailutong: 'var(--font-bailutong), "Microsoft YaHei", sans-serif',
};
const FONT_CSS_VARIABLES: Record<CalendarTextFont, string> = {
  aventa: "--font-aventa",
  morganite: "--font-morganite",
  pingfang: "--font-pingfang",
  bailutong: "--font-bailutong",
};
const TEXT_FONT_SIZES = [16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96, 120, 144, 160];
type PointLayer = { type: "text" } | { type: "sticker"; index: number };
type TextResizeDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
type JournalLaunchOrigin = {
  date: string;
  image: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

const TEXT_RESIZE_HANDLES: Array<{ direction: TextResizeDirection; label: string; className: string }> = [
  { direction: "nw", label: "从左上角调整文字框", className: styles.resizeNorthWest },
  { direction: "n", label: "调整文字框上边缘", className: styles.resizeNorth },
  { direction: "ne", label: "从右上角调整文字框", className: styles.resizeNorthEast },
  { direction: "e", label: "调整文字框右边缘", className: styles.resizeEast },
  { direction: "se", label: "从右下角调整文字框", className: styles.resizeSouthEast },
  { direction: "s", label: "调整文字框下边缘", className: styles.resizeSouth },
  { direction: "sw", label: "从左下角调整文字框", className: styles.resizeSouthWest },
  { direction: "w", label: "调整文字框左边缘", className: styles.resizeWest },
];
const STICKER_RESIZE_HANDLES = [
  { label: "从左上角缩放贴纸", className: styles.resizeNorthWest },
  { label: "从右上角缩放贴纸", className: styles.resizeNorthEast },
  { label: "从右下角缩放贴纸", className: styles.resizeSouthEast },
  { label: "从左下角缩放贴纸", className: styles.resizeSouthWest },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeAngle(value: number) {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function AlignmentIcon({ value }: { value: "left" | "center" | "right" }) {
  const positions = value === "left"
    ? [[2, 14], [2, 11], [2, 15], [2, 9]]
    : value === "center"
      ? [[3, 13], [4.5, 11.5], [2.5, 13.5], [5, 11]]
      : [[2, 14], [5, 14], [1, 14], [7, 14]];
  return <svg aria-hidden="true" viewBox="0 0 16 16">
    {positions.map(([start, end], index) => <path d={`M${start} ${3 + index * 3.2}H${end}`} key={index} />)}
  </svg>;
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || "请求失败。");
  return body as T;
}
function preview(entry: CalendarEntryView | null) {
  return entry?.assets.find((asset) => asset.role === "thumbnail")?.url
    ?? entry?.assets.find((asset) => asset.role === "preview")?.url;
}
function canvasBlob(canvas: HTMLCanvasElement, type: "image/png" | "image/webp", quality?: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("无法创建手账图片。")),
    type,
    quality,
  ));
}
function preloadImage(url: string, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    const cleanup = () => signal?.removeEventListener("abort", abort);
    const abort = () => {
      cleanup();
      image.onload = null;
      image.onerror = null;
      image.src = "";
      reject(new DOMException("已取消加载。", "AbortError"));
    };
    if (signal?.aborted) return abort();
    signal?.addEventListener("abort", abort, { once: true });
    image.onload = () => image.decode().catch(() => undefined).then(() => {
      if (signal?.aborted) return;
      cleanup();
      resolve();
    });
    image.onerror = () => {
      cleanup();
      reject(new Error("手账图片加载失败。"));
    };
    image.src = url;
  });
}

export default function CalendarExperience({ year, month, today, initialDays }: {
  year: number;
  month: number;
  today: { year: number; month: number; day: number };
  initialDays: CalendarMonthDay[];
}) {
  const [days, setDays] = useState(initialDays);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [day, setDay] = useState<CalendarDayPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [journalLaunch, setJournalLaunch] = useState(false);
  const [launchOrigin, setLaunchOrigin] = useState<JournalLaunchOrigin | null>(null);
  const [openHasEntry, setOpenHasEntry] = useState(false);
  const [error, setError] = useState("");
  const requestAbortRef = useRef<AbortController | null>(null);
  const first = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellCount = Math.ceil((first + count) / 7) * 7;
  const dayMap = useMemo(() => new Map(days.map((item) => [item.date, item])), [days]);
  const grid = Array.from({ length: cellCount }, (_, index) => {
    const value = index - first + 1;
    return value >= 1 && value <= count ? value : null;
  });

  useEffect(() => () => requestAbortRef.current?.abort(), []);

  async function open(value: string, entry: CalendarEntryView | null, anchor: HTMLButtonElement) {
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    const launchImage = preview(entry);
    const launchFromThumbnail = Boolean(entry?.layout && launchImage);
    const anchorRect = anchor.getBoundingClientRect();
    setJournalLaunch(launchFromThumbnail);
    setLaunchOrigin(launchFromThumbnail && launchImage ? {
      date: value,
      image: launchImage,
      left: anchorRect.left,
      top: anchorRect.top,
      width: anchorRect.width,
      height: anchorRect.height,
    } : null);
    setOpenHasEntry(Boolean(entry?.layout));
    setOpenDate(value);
    setLoading(true);
    setError("");
    setDay(null);
    try {
      const request = jsonRequest<CalendarDayPayload>(`/api/private/calendar/days/${value}`, { signal: controller.signal });
      const result = launchFromThumbnail
        ? (await Promise.all([request, new Promise((resolve) => window.setTimeout(resolve, JOURNAL_BLUR_SETTLE_MS))]))[0]
        : await request;
      const displayImage = result.entry?.assets.find((asset) => asset.role === "preview")?.url
        ?? result.entry?.assets.find((asset) => asset.role === "thumbnail")?.url;
      if (launchFromThumbnail && displayImage) {
        try {
          await preloadImage(displayImage, controller.signal);
        } catch {
          if (controller.signal.aborted) return;
          // The thumbnail can still morph when the larger preview cannot be preloaded.
        }
      }
      if (controller.signal.aborted) return;
      startTransition(() => {
        setDay(result);
        setLoading(false);
      });
    } catch (reason) {
      if (controller.signal.aborted) return;
      setError(reason instanceof Error ? reason.message : "无法读取当天内容。");
      setLoading(false);
    } finally {
      if (requestAbortRef.current === controller) requestAbortRef.current = null;
    }
  }
  function close() {
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    startTransition(() => {
      setOpenDate(null);
      setDay(null);
      setLoading(false);
      setJournalLaunch(false);
      setLaunchOrigin(null);
      setOpenHasEntry(false);
    });
  }
  function entryChanged(entry: CalendarEntryView) {
    setDay((current) => current ? { ...current, entry } : current);
    setDays((current) => current.some((item) => item.date === entry.date)
      ? current.map((item) => item.date === entry.date ? { ...item, entry } : item)
      : [...current, { date: entry.date, photoCount: 0, foodCount: 0, entry }]);
  }
  function entryDeleted(date: string) {
    setDay((current) => current ? { ...current, entry: null } : current);
    setDays((current) => current.map((item) => item.date === date ? { ...item, entry: null } : item));
    setOpenDate(null);
  }

  return <>
    <div className={styles.calendarScroll}>
      <div className={styles.calendar} role="grid" aria-label={`${year} 年 ${month} 月月历`}>
        <div className={styles.weekHeader} role="row">
          {WEEKDAYS.map((value) => <div role="columnheader" key={value}>{value}</div>)}
        </div>
        <div className={styles.dayGrid}>
          {grid.map((value, index) => {
            if (!value) return <div className={styles.emptyDay} aria-hidden="true" key={`empty-${index}`} />;
            const date = `${year}-${String(month).padStart(2, "0")}-${String(value).padStart(2, "0")}`;
            const info = dayMap.get(date);
            const image = preview(info?.entry ?? null);
            const dateNumberStyle = info?.entry?.layout?.dateNumber;
            const active = Boolean(info && (info.photoCount || info.foodCount || info.entry));
            const isToday = year === today.year && month === today.month && value === today.day;
            const isLaunching = journalLaunch && loading && openDate === date;
            const isViewing = journalLaunch && !loading && openDate === date && Boolean(day?.entry?.layout);
            return <button key={date} type="button" className={`${styles.dayCell} ${active ? styles.hasContent : ""} ${isToday ? styles.today : ""}`} onClick={(event) => active && open(date, info?.entry ?? null, event.currentTarget)} disabled={!active || isLaunching} aria-busy={isLaunching || undefined} aria-label={`${date}${active ? `，${info?.photoCount ?? 0} 张照片，${info?.foodCount ?? 0} 条美食记录` : "，暂无内容"}`}>
              {image && !isViewing ? <div className={`${styles.cellPreviewFrame} ${isLaunching ? styles.launchingPreview : ""}`}>
                {isLaunching ? <div className={styles.cellSharedImage}><img src={image} alt="" className={styles.cellPreview} loading="lazy" decoding="async" /></div> : <ViewTransition name={`calendar-journal-${date}`} share="morph" default="none"><div className={styles.cellSharedImage}><img src={image} alt="" className={styles.cellPreview} loading="lazy" decoding="async" /></div></ViewTransition>}
              </div> : null}
              <time dateTime={date} className={styles.dayNumber} style={dateNumberStyle ? { color: dateNumberStyle.color, fontFamily: FONT_FAMILIES[dateNumberStyle.font] } : undefined}>{value}</time>
              {info?.entry && !image ? <span className={styles.entryState}>{info.entry.status === "ready" ? "已保存" : info.entry.status === "failed" ? "生成失败" : "草稿"}</span> : null}
              {active && !image ? <span className={styles.sourceDots} aria-hidden="true">{info?.photoCount ? "PHOTO" : ""}{info?.foodCount ? " FOOD" : ""}</span> : null}
            </button>;
          })}
        </div>
      </div>
    </div>
    {journalLaunch && loading && launchOrigin ? <div className={styles.floatingLaunchPreview} style={{ left: launchOrigin.left, top: launchOrigin.top, width: launchOrigin.width, height: launchOrigin.height }} aria-hidden="true">
      <ViewTransition name={`calendar-journal-${launchOrigin.date}`} share="morph" default="none"><div className={styles.cellSharedImage}><img src={launchOrigin.image} alt="" className={styles.cellPreview} /></div></ViewTransition>
      <span className={styles.cellLoader}><i /></span>
    </div> : null}
    {openDate ? <DayDialog key={`${openDate}-${journalLaunch ? "journal" : loading}`} date={openDate} day={day} loading={loading} error={error} initialHasEntry={openHasEntry} viewerLaunch={journalLaunch} onClose={close} onEntryChange={entryChanged} onEntryDelete={entryDeleted} /> : null}
  </>;
}

function DayDialog({ date, day, loading, error, initialHasEntry, viewerLaunch, onClose, onEntryChange, onEntryDelete }: {
  date: string;
  day: CalendarDayPayload | null;
  loading: boolean;
  error: string;
  initialHasEntry: boolean;
  viewerLaunch: boolean;
  onClose: () => void;
  onEntryChange: (entry: CalendarEntryView) => void;
  onEntryDelete: (date: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit">(() => initialHasEntry ? "view" : "edit");
  const [selectedSources, setSelectedSources] = useState<string[]>(() => day?.sources.map((source) => `${source.type}:${source.id}`) ?? []);
  const [selectedImages, setSelectedImages] = useState<string[]>(() => day?.sources.flatMap((source) => source.imageIds).slice(0, CALENDAR_MAX_IMAGES) ?? []);
  const [note, setNote] = useState(() => day?.entry?.userNote ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const bodyPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    if (scrollbarWidth > 0) body.style.paddingRight = `${bodyPaddingRight + scrollbarWidth}px`;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, []);

  useEffect(() => {
    if (!viewerLaunch || mode !== "view") return;
    const body = document.body;
    body.classList.add("calendar-journal-viewer-open");
    return () => body.classList.remove("calendar-journal-viewer-open");
  }, [mode, viewerLaunch]);

  function toggleSource(sourceKey: string, imageIds: string[], checked: boolean) {
    setSelectedSources((current) => checked ? [...new Set([...current, sourceKey])] : current.filter((item) => item !== sourceKey));
    setSelectedImages((current) => checked
      ? [...new Set([...current, ...imageIds])].slice(0, CALENDAR_MAX_IMAGES)
      : current.filter((id) => !imageIds.includes(id)));
  }
  function toggleImage(imageId: string, checked: boolean) {
    if (checked && selectedImages.length >= CALENDAR_MAX_IMAGES) {
      setMessage(`最多选择 ${CALENDAR_MAX_IMAGES} 张图片。`);
      return;
    }
    setMessage("");
    setSelectedImages((current) => checked ? [...new Set([...current, imageId])] : current.filter((id) => id !== imageId));
  }
  function editEntry() {
    if (day) {
      setSelectedSources(day.sources.map((source) => `${source.type}:${source.id}`));
      setSelectedImages(day.sources.flatMap((source) => source.imageIds).slice(0, CALENDAR_MAX_IMAGES));
      setNote(day.entry?.userNote ?? "");
    }
    setMode("edit");
  }
  async function generate() {
    if (!selectedSources.length) return setMessage("请至少选择一条素材。");
    const selectedSourceSet = new Set(selectedSources);
    const allowedImageIds = new Set(day?.sources.filter((source) => selectedSourceSet.has(`${source.type}:${source.id}`)).flatMap((source) => source.imageIds) ?? []);
    const imageIds = selectedImages.filter((id) => allowedImageIds.has(id));
    setBusy(true);
    setMessage("");
    try {
      const result = await jsonRequest<{ entry: CalendarEntryView }>(`/api/private/calendar/days/${date}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceIds: selectedSources, imageIds, userNote: note }),
      });
      onEntryChange(result.entry);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "生成失败。");
    } finally {
      setBusy(false);
    }
  }
  async function removeEntry() {
    if (!day?.entry || !window.confirm("确定删除这一天的手账吗？Photo 和 Food 原始记录不会被删除。")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/private/calendar/entries/${day.entry.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "删除失败。");
      }
      onEntryDelete(date);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "删除失败。");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "view" && (viewerLaunch || day?.entry?.layout)) {
    return <div className={styles.journalViewerBackdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      {loading ? <p className={styles.srOnly} role="status">正在加载手账</p> : error ? <div className={styles.viewerError} role="alert"><p>{error}</p><button type="button" onClick={onClose}>返回日历</button></div> : day?.entry?.layout ? <section role="dialog" aria-modal="true" aria-label={`${date} 手账`} className={styles.journalViewerStage}>
        <JournalViewer entry={day.entry} busy={busy} message={message} shared busyLabel="删除中…" onEdit={editEntry} onDelete={removeEntry} />
      </section> : null}
    </div>;
  }

  return <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="day-dialog-title" className={`${styles.dialog} ${mode === "view" ? styles.viewerDialog : ""}`}>
      <header className={styles.dialogHeader}>
        <div><p>{mode === "view" ? "Journal page" : "Daily archive"}</p><h2 id="day-dialog-title">{date}</h2></div>
        <button type="button" onClick={onClose} aria-label="关闭">×</button>
      </header>
      {loading ? <p className={styles.dialogStatus}>正在翻找这一天…</p> : error ? <p className={styles.dialogStatus}>{error}</p> : day?.entry?.layout && mode === "view" ? <JournalViewer entry={day.entry} busy={busy} message={message} onEdit={editEntry} onDelete={removeEntry} /> : day ? <div className={styles.dialogBody}>
        <div className={styles.sourceColumn}>
          <div className={styles.sourceToolbar}>
            <div><p className={styles.sectionLabel}>当天素材</p><span>选择要参与生成的记录与图片</span></div>
            <output>{selectedImages.length}/{CALENDAR_MAX_IMAGES}</output>
          </div>
          {day.sources.map((source) => {
            const sourceKey = `${source.type}:${source.id}`;
            const sourceChecked = selectedSources.includes(sourceKey);
            return <article className={styles.sourceCard} key={sourceKey}>
              <label className={styles.sourceToggle}><input type="checkbox" checked={sourceChecked} onChange={(event) => toggleSource(sourceKey, source.imageIds, event.target.checked)} /><span>{source.type === "photo" ? "Photo" : "Food"}</span></label>
              <div className={styles.sourceImages}>{source.imageUrls.map((url, imageIndex) => {
                const imageId = source.imageIds[imageIndex];
                return <label className={`${styles.imageChoice} ${selectedImages.includes(imageId) ? styles.imageSelected : ""}`} key={imageId}>
                  <img src={url} alt={`${source.title} 图片 ${imageIndex + 1}`} />
                  <input type="checkbox" checked={selectedImages.includes(imageId)} disabled={!sourceChecked} onChange={(event) => toggleImage(imageId, event.target.checked)} />
                  <span>{selectedImages.includes(imageId) ? "已选" : "选择"}</span>
                </label>;
              })}</div>
              <h3>{source.title}</h3>
              {source.description ? <p>{source.description}</p> : null}
              {source.comments.map((comment) => <blockquote key={comment.id}><b>{comment.author}</b>：{comment.content}</blockquote>)}
            </article>;
          })}
          {day.sources.length === 0 ? <p className={styles.dialogStatus}>这一天还没有可用素材。</p> : null}
        </div>
        <div className={styles.creationColumn}>
          {day.entry?.layout ? <JournalEditor key={day.entry.updatedAt} entry={day.entry} onSaved={(entry) => { onEntryChange(entry); setMode("view"); }} /> : <div className={styles.blankCanvas}><span>{date.slice(8)}</span><p>选择素材后生成<br />这一日的手账</p></div>}
          <section className={styles.generationPanel}>
            <div className={styles.panelHeading}><div><p>AI generation</p><h3>{day.entry ? "重新生成" : "生成手账"}</h3></div><span>可选</span></div>
            <label className={styles.noteField}><span>写给 AI 的补充</span><textarea value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} placeholder="心情、想强调的片段，或不希望出现的内容…" /></label>
            <button className={styles.primaryButton} type="button" disabled={busy || !day.aiAvailable || day.sources.length === 0} onClick={generate}>{busy ? "生成中，请稍候…" : day.entry ? "重新生成" : "生成 Cover、文字与贴纸"}</button>
            {!day.aiAvailable ? <p className={styles.helper}>服务端尚未配置 CALENDAR_AI_API_KEY。</p> : null}
            {message ? <p className={styles.helper}>{message}</p> : null}
          </section>
        </div>
      </div> : null}
    </section>
  </div>;
}

function JournalViewer({ entry, busy, message, shared = false, busyLabel = "删除中…", onEdit, onDelete }: { entry: CalendarEntryView; busy: boolean; message: string; shared?: boolean; busyLabel?: string; onEdit: () => void; onDelete: () => void }) {
  const previewAsset = entry.assets.find((asset) => asset.role === "preview");
  const coverAsset = entry.assets.find((asset) => asset.role === "cover");
  const layout = entry.layout;
  const artwork = previewAsset ? <div className={styles.viewerArtwork}><img src={previewAsset.url} alt={`${entry.date} 手账`} decoding="async" /></div> : layout ? <div className={styles.viewerArtwork} style={{ backgroundImage: coverAsset ? `url(${coverAsset.url})` : undefined, backgroundPosition: `${layout.cover.cropX * 100}% ${layout.cover.cropY * 100}%`, backgroundSize: `${layout.cover.scale * 100}%` }}>
      <div className={styles.viewerText} style={{ left: `${layout.text.x * 100}%`, top: `${layout.text.y * 100}%`, width: `${layout.text.width * 100}%`, height: `${layout.text.height * 100}%`, color: layout.text.style.color, textAlign: layout.text.style.align, fontFamily: FONT_FAMILIES[layout.text.style.font], fontSize: `${layout.text.style.fontSize / 10.24}cqi`, textShadow: layout.text.style.shadow ? "0 2px 8px rgb(0 0 0 / 50%)" : "none", textDecorationLine: layout.text.style.underline ? "underline" : "none", textDecorationThickness: ".07em", textUnderlineOffset: ".14em" }}>{entry.finalText}</div>
      {layout.stickers.map((sticker) => { const asset = entry.assets.find((item) => item.id === sticker.assetId); return asset ? <img className={styles.viewerSticker} src={asset.url} alt="" key={sticker.assetId} style={{ left: `${sticker.x * 100}%`, top: `${sticker.y * 100}%`, width: `${sticker.width * 100}%`, transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)` }} /> : null; })}
    </div> : <div className={styles.viewerArtwork}><p>手账预览暂不可用。</p></div>;
  return <div className={styles.viewer}>
    {shared ? <ViewTransition name={`calendar-journal-${entry.date}`} share="morph" default="none">{artwork}</ViewTransition> : artwork}
    <div className={styles.viewerActions}>
      <button type="button" className={styles.secondaryButton} onClick={onEdit} disabled={busy}>编辑</button>
      <button type="button" className={styles.deleteButton} onClick={onDelete} disabled={busy}>{busy ? busyLabel : "删除"}</button>
    </div>
    {message ? <p className={styles.helper}>{message}</p> : null}
  </div>;
}

function JournalEditor({ entry, onSaved }: { entry: CalendarEntryView; onSaved: (entry: CalendarEntryView) => void }) {
  const [layout, setLayout] = useState(entry.layout!);
  const [text, setText] = useState(entry.finalText);
  const [selected, setSelected] = useState<PointLayer>({ type: "text" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const cover = entry.assets.find((asset) => asset.id === layout.cover.assetId);
  const stickers = layout.stickers.map((item) => ({ ...item, asset: entry.assets.find((asset) => asset.id === item.assetId) })).filter((item) => item.asset);
  const activeIndex = selected.type === "sticker" ? selected.index : -1;
  const active = activeIndex >= 0 ? layout.stickers[activeIndex] : null;
  const fontSizes = TEXT_FONT_SIZES.includes(layout.text.style.fontSize)
    ? TEXT_FONT_SIZES
    : [...TEXT_FONT_SIZES, layout.text.style.fontSize].sort((a, b) => a - b);

  function changePoint(layer: PointLayer, x: number, y: number) {
    setLayout((current) => layer.type === "text"
      ? { ...current, text: { ...current.text, x: clamp(x, 0, 1 - current.text.width), y: clamp(y, current.text.height / 2, 1 - current.text.height / 2) } }
      : { ...current, stickers: current.stickers.map((item, index) => index === layer.index ? { ...item, x: clamp(x, 0, 1), y: clamp(y, 0, 1) } : item) });
  }

  function beginPointerGesture(event: React.PointerEvent<HTMLElement>, onMove: (event: PointerEvent) => void) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    const end = () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  }

  function pointerDown(event: React.PointerEvent<HTMLElement>, layer: PointLayer) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const current = layer.type === "text" ? layout.text : layout.stickers[layer.index];
    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startX = current.x;
    const startY = current.y;
    setSelected(layer);
    beginPointerGesture(event, (next) => changePoint(
      layer,
      startX + (next.clientX - startClientX) / rect.width,
      startY + (next.clientY - startClientY) / rect.height,
    ));
  }

  function keyMove(event: React.KeyboardEvent, layer: PointLayer) {
    const current = layer.type === "text" ? layout.text : layout.stickers[layer.index];
    const step = event.shiftKey ? .04 : .01;
    const delta = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[event.key];
    if (!delta) return;
    event.preventDefault();
    changePoint(layer, current.x + delta[0], current.y + delta[1]);
  }

  function resizeText(direction: TextResizeDirection, deltaX: number, deltaY: number, origin = layout.text) {
    const minimumWidth = .1;
    const minimumHeight = .08;
    let left = origin.x;
    let right = origin.x + origin.width;
    let top = origin.y - origin.height / 2;
    let bottom = origin.y + origin.height / 2;
    if (direction.includes("w")) left = clamp(left + deltaX, 0, right - minimumWidth);
    if (direction.includes("e")) right = clamp(right + deltaX, left + minimumWidth, 1);
    if (direction.includes("n")) top = clamp(top + deltaY, 0, bottom - minimumHeight);
    if (direction.includes("s")) bottom = clamp(bottom + deltaY, top + minimumHeight, 1);
    setLayout((current) => ({
      ...current,
      text: { ...current.text, x: left, y: (top + bottom) / 2, width: right - left, height: bottom - top },
    }));
  }

  function textResizePointerDown(event: React.PointerEvent<HTMLButtonElement>, direction: TextResizeDirection) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const origin = { ...layout.text };
    const startClientX = event.clientX;
    const startClientY = event.clientY;
    setSelected({ type: "text" });
    beginPointerGesture(event, (next) => resizeText(
      direction,
      (next.clientX - startClientX) / rect.width,
      (next.clientY - startClientY) / rect.height,
      origin,
    ));
  }

  function textResizeKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, direction: TextResizeDirection) {
    const step = event.shiftKey ? .04 : .01;
    const delta = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[event.key];
    if (!delta) return;
    event.preventDefault();
    resizeText(direction, delta[0], delta[1]);
  }

  function stickerResizePointerDown(event: React.PointerEvent<HTMLButtonElement>, index: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sticker = layout.stickers[index];
    const centerX = rect.left + sticker.x * rect.width;
    const centerY = rect.top + sticker.y * rect.height;
    const startDistance = Math.max(8, Math.hypot(event.clientX - centerX, event.clientY - centerY));
    const startWidth = sticker.width;
    setSelected({ type: "sticker", index });
    beginPointerGesture(event, (next) => {
      const distance = Math.hypot(next.clientX - centerX, next.clientY - centerY);
      const width = clamp(startWidth * distance / startDistance, .05, .7);
      setLayout((current) => ({ ...current, stickers: current.stickers.map((item, itemIndex) => itemIndex === index ? { ...item, width } : item) }));
    });
  }

  function stickerResizeKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === "ArrowUp" || event.key === "ArrowRight"
      ? (event.shiftKey ? .04 : .01)
      : event.key === "ArrowDown" || event.key === "ArrowLeft"
        ? -(event.shiftKey ? .04 : .01)
        : 0;
    if (!delta) return;
    event.preventDefault();
    setLayout((current) => ({ ...current, stickers: current.stickers.map((item, itemIndex) => itemIndex === index ? { ...item, width: clamp(item.width + delta, .05, .7) } : item) }));
  }

  function stickerRotatePointerDown(event: React.PointerEvent<HTMLButtonElement>, index: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sticker = layout.stickers[index];
    const centerX = rect.left + sticker.x * rect.width;
    const centerY = rect.top + sticker.y * rect.height;
    const startAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
    const startRotation = sticker.rotation;
    setSelected({ type: "sticker", index });
    beginPointerGesture(event, (next) => {
      const angle = Math.atan2(next.clientY - centerY, next.clientX - centerX);
      const rotation = normalizeAngle(startRotation + (angle - startAngle) * 180 / Math.PI);
      setLayout((current) => ({ ...current, stickers: current.stickers.map((item, itemIndex) => itemIndex === index ? { ...item, rotation: Math.round(rotation) } : item) }));
    });
  }

  function stickerRotateKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === "ArrowRight" || event.key === "ArrowUp"
      ? (event.shiftKey ? 15 : 5)
      : event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? -(event.shiftKey ? 15 : 5)
        : 0;
    if (!delta) return;
    event.preventDefault();
    setLayout((current) => ({ ...current, stickers: current.stickers.map((item, itemIndex) => itemIndex === index ? { ...item, rotation: normalizeAngle(item.rotation + delta) } : item) }));
  }

  function updateTextStyle(patch: Partial<typeof layout.text.style>) {
    setLayout((current) => ({ ...current, text: { ...current.text, style: { ...current.text.style, ...patch } } }));
  }
  async function loadImage(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const value = new Image(); value.onload = () => resolve(value); value.onerror = reject; value.src = url;
    });
  }
  async function renderPreview() {
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#d8d9d5";
    context.fillRect(0, 0, 1024, 1024);
    if (cover) {
      const source = await loadImage(cover.url);
      const size = Math.min(source.width, source.height) / layout.cover.scale;
      const sx = Math.max(0, Math.min(source.width - size, source.width * layout.cover.cropX - size / 2));
      const sy = Math.max(0, Math.min(source.height - size, source.height * layout.cover.cropY - size / 2));
      context.drawImage(source, sx, sy, size, size, 0, 0, 1024, 1024);
    }
    for (const sticker of stickers) {
      const source = await loadImage(sticker.asset!.url);
      const width = sticker.width * 1024;
      const height = width * source.height / source.width;
      context.save(); context.translate(sticker.x * 1024, sticker.y * 1024); context.rotate(sticker.rotation * Math.PI / 180);
      context.drawImage(source, -width / 2, -height / 2, width, height); context.restore();
    }
    const cssVariable = FONT_CSS_VARIABLES[layout.text.style.font];
    const loadedFamily = getComputedStyle(document.documentElement).getPropertyValue(cssVariable).trim() || "sans-serif";
    const fontSize = layout.text.style.fontSize;
    const lineHeight = fontSize * 1.35;
    const maxWidth = layout.text.width * 1024;
    const maxHeight = layout.text.height * 1024;
    context.fillStyle = layout.text.style.color;
    context.font = `${fontSize}px ${loadedFamily}, "Microsoft YaHei", sans-serif`;
    context.textAlign = layout.text.style.align;
    context.textBaseline = "top";
    context.shadowColor = layout.text.style.shadow ? "rgba(0,0,0,.35)" : "transparent";
    context.shadowBlur = layout.text.style.shadow ? 8 : 0;
    const lines: string[] = [];
    for (const paragraph of text.split(/\r?\n/u)) {
      let line = "";
      for (const word of Array.from(paragraph)) {
        const test = line + word;
        if (context.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
      }
      lines.push(line);
    }
    const anchor = layout.text.style.align === "left" ? 0 : layout.text.style.align === "center" ? maxWidth / 2 : maxWidth;
    const textTop = layout.text.y * 1024 - maxHeight / 2;
    const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
    context.save();
    context.beginPath();
    context.rect(layout.text.x * 1024, textTop, maxWidth, maxHeight);
    context.clip();
    lines.slice(0, maxLines).forEach((value, index) => {
      const textX = layout.text.x * 1024 + anchor;
      const lineTop = textTop + index * lineHeight;
      context.fillText(value, textX, lineTop, maxWidth);
      if (layout.text.style.underline && value) {
        const measuredWidth = Math.min(context.measureText(value).width, maxWidth);
        const lineStart = layout.text.style.align === "left" ? textX : layout.text.style.align === "center" ? textX - measuredWidth / 2 : textX - measuredWidth;
        context.beginPath();
        context.lineWidth = Math.max(1.5, fontSize * .055);
        context.strokeStyle = layout.text.style.color;
        context.moveTo(lineStart, lineTop + fontSize * 1.08);
        context.lineTo(lineStart + measuredWidth, lineTop + fontSize * 1.08);
        context.stroke();
      }
    });
    context.restore();
    const thumbnailCanvas = document.createElement("canvas");
    thumbnailCanvas.width = thumbnailCanvas.height = 256;
    const thumbnailContext = thumbnailCanvas.getContext("2d")!;
    thumbnailContext.drawImage(canvas, 0, 0, 256, 256);
    const [previewBlob, thumbnailBlob] = await Promise.all([
      canvasBlob(canvas, "image/png"),
      canvasBlob(thumbnailCanvas, "image/webp", .78),
    ]);
    return { previewBlob, thumbnailBlob };
  }
  async function save() {
    setBusy(true); setMessage("");
    try {
      const { previewBlob, thumbnailBlob } = await renderPreview();
      const [previewResponse, thumbnailResponse] = await Promise.all([
        fetch(`/api/private/calendar/entries/${entry.id}/preview`, { method: "PUT", headers: { "Content-Type": "image/png" }, body: previewBlob }),
        fetch(`/api/private/calendar/entries/${entry.id}/preview?variant=thumbnail`, { method: "PUT", headers: { "Content-Type": "image/webp" }, body: thumbnailBlob }),
      ]);
      if (!previewResponse.ok) throw new Error("预览图保存失败。");
      if (!thumbnailResponse.ok) { const body = await thumbnailResponse.json().catch(() => ({})) as { error?: string }; throw new Error(body.error || "日历缩略图保存失败。"); }
      const result = await jsonRequest<{ entry: CalendarEntryView }>(`/api/private/calendar/entries/${entry.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finalText: text, layout, updatedAt: entry.updatedAt }) });
      onSaved(result.entry);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "保存失败。");
    } finally {
      setBusy(false);
    }
  }
  return <div className={styles.editor}>
    <span className={styles.srOnly} style={{ fontFamily: FONT_FAMILIES[layout.text.style.font] }} aria-hidden="true">手账字体加载</span>
    <div className={styles.panelHeading}><div><p>Journal editor</p><h3>手账排版</h3></div><span>1:1</span></div>
    <div className={styles.canvas} ref={canvasRef} style={{ backgroundImage: cover ? `url(${cover.url})` : undefined, backgroundPosition: `${layout.cover.cropX * 100}% ${layout.cover.cropY * 100}%`, backgroundSize: `${layout.cover.scale * 100}%` }}>
      <div className={`${styles.layerFrame} ${styles.textFrame} ${selected.type === "text" ? styles.selectedLayer : ""}`} style={{ left: `${layout.text.x * 100}%`, top: `${layout.text.y * 100}%`, width: `${layout.text.width * 100}%`, height: `${layout.text.height * 100}%`, zIndex: layout.text.zIndex }}>
        <button type="button" aria-label="移动文字框" title="拖动移动文字框" className={styles.textLayer} style={{ color: layout.text.style.color, textAlign: layout.text.style.align, fontFamily: FONT_FAMILIES[layout.text.style.font], fontSize: `${layout.text.style.fontSize / 10.24}cqi`, textShadow: layout.text.style.shadow ? "0 2px 8px rgb(0 0 0 / 50%)" : "none", textDecorationLine: layout.text.style.underline ? "underline" : "none", textDecorationThickness: ".07em", textUnderlineOffset: ".14em" }} onPointerDown={(event) => pointerDown(event, { type: "text" })} onKeyDown={(event) => keyMove(event, { type: "text" })}>{text}</button>
        {selected.type === "text" ? TEXT_RESIZE_HANDLES.map((handle) => <button type="button" key={handle.direction} className={`${styles.layerHandle} ${styles.textResizeHandle} ${handle.className}`} aria-label={handle.label} title={handle.label} onPointerDown={(event) => textResizePointerDown(event, handle.direction)} onKeyDown={(event) => textResizeKeyDown(event, handle.direction)} />) : null}
      </div>
      {stickers.map((sticker, index) => {
        const isSelected = selected.type === "sticker" && selected.index === index;
        return <div key={sticker.assetId} className={`${styles.layerFrame} ${styles.stickerFrame} ${isSelected ? styles.selectedLayer : ""}`} style={{ left: `${sticker.x * 100}%`, top: `${sticker.y * 100}%`, width: `${sticker.width * 100}%`, transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`, zIndex: sticker.zIndex }}>
          <button type="button" className={styles.stickerLayer} aria-label={`移动贴纸 ${index + 1}`} title="拖动移动贴纸" onPointerDown={(event) => pointerDown(event, { type: "sticker", index })} onKeyDown={(event) => keyMove(event, { type: "sticker", index })}><img src={sticker.asset!.url} alt={`贴纸 ${index + 1}`} draggable={false} /></button>
          {isSelected ? <>
            <span className={styles.rotationArm} aria-hidden="true" />
            <button type="button" className={`${styles.layerHandle} ${styles.rotationHandle}`} aria-label="旋转贴纸" title="拖动旋转贴纸" onPointerDown={(event) => stickerRotatePointerDown(event, index)} onKeyDown={(event) => stickerRotateKeyDown(event, index)} />
            {STICKER_RESIZE_HANDLES.map((handle) => <button type="button" key={handle.label} className={`${styles.layerHandle} ${styles.stickerResizeHandle} ${handle.className}`} aria-label={handle.label} title={handle.label} onPointerDown={(event) => stickerResizePointerDown(event, index)} onKeyDown={(event) => stickerResizeKeyDown(event, index)} />)}
          </> : null}
        </div>;
      })}
    </div>
    <div className={styles.editorControls}>
      <section className={styles.controlSection}>
        <div className={styles.controlHeading}><div><b>文字</b><span>像文档一样排版，再到画布中调整边界</span></div><output>{text.length}/4000</output></div>
        <label className={styles.textareaControl}><span className={styles.srOnly}>手账文字</span><textarea value={text} maxLength={4000} onChange={(event) => setText(event.target.value)} /></label>
        <div className={styles.formatToolbar} role="toolbar" aria-label="文字格式">
          <label className={`${styles.toolbarField} ${styles.fontField}`}><span>字体</span><select value={layout.text.style.font} onChange={(event) => updateTextStyle({ font: event.target.value as CalendarTextFont })}><option value="aventa">Aventa</option><option value="morganite">Morganite</option><option value="pingfang">平方上上谦体</option><option value="bailutong">白路彤彤手写体</option></select></label>
          <label className={`${styles.toolbarField} ${styles.sizeField}`}><span>字号</span><select value={layout.text.style.fontSize} onChange={(event) => updateTextStyle({ fontSize: Number(event.target.value) })}>{fontSizes.map((size) => <option value={size} key={size}>{size}</option>)}</select></label>
          <label className={styles.toolbarColor} title="文字颜色"><span>颜色</span><i style={{ backgroundColor: layout.text.style.color }} aria-hidden="true" /><input type="color" value={layout.text.style.color} aria-label="文字颜色" onChange={(event) => updateTextStyle({ color: event.target.value })} /></label>
          <span className={styles.toolbarDivider} aria-hidden="true" />
          <div className={styles.toolbarButtonGroup} aria-label="文字对齐">
            {(["left", "center", "right"] as const).map((align) => <button type="button" key={align} className={`${styles.formatButton} ${layout.text.style.align === align ? styles.formatButtonActive : ""}`} aria-label={align === "left" ? "左对齐" : align === "center" ? "居中对齐" : "右对齐"} aria-pressed={layout.text.style.align === align} title={align === "left" ? "左对齐" : align === "center" ? "居中对齐" : "右对齐"} onClick={() => updateTextStyle({ align })}><AlignmentIcon value={align} /></button>)}
          </div>
          <button type="button" className={`${styles.formatButton} ${layout.text.style.underline ? styles.formatButtonActive : ""}`} aria-label="下划线" aria-pressed={layout.text.style.underline} title="下划线" onClick={() => updateTextStyle({ underline: !layout.text.style.underline })}><span className={styles.underlineGlyph} aria-hidden="true">U</span></button>
          <button type="button" className={`${styles.formatButton} ${layout.text.style.shadow ? styles.formatButtonActive : ""}`} aria-label="文字阴影" aria-pressed={layout.text.style.shadow} title="文字阴影" onClick={() => updateTextStyle({ shadow: !layout.text.style.shadow })}><span className={styles.shadowGlyph} aria-hidden="true">A</span></button>
        </div>
      </section>
      <section className={styles.controlSection}>
        <div className={styles.controlHeading}><div><b>画面</b><span>Cover 保留精确数值；画布对象直接拖动</span></div></div>
        <div className={styles.objectStatus} aria-live="polite">
          <span>当前对象</span><b>{active ? `贴纸 ${activeIndex + 1}` : "文字框"}</b><small>{active ? `拖动四角缩放 · 顶部圆点旋转 · 当前 ${Math.round(active.width * 100)}% / ${active.rotation}°` : "拖动边缘或四角调整文字框大小"}</small>
        </div>
        <div className={`${styles.rangeGrid} ${styles.coverRange}`}>
          <label><span>Cover 缩放 <output>{layout.cover.scale.toFixed(2)}×</output></span><input type="range" min="1" max="4" step=".05" value={layout.cover.scale} onChange={(event) => setLayout({ ...layout, cover: { ...layout.cover, scale: Number(event.target.value) } })} /></label>
        </div>
        <fieldset className={styles.dateStyleControls}>
          <legend>日历格日期数字</legend>
          <label>字体<select value={layout.dateNumber.font} onChange={(event) => setLayout({ ...layout, dateNumber: { ...layout.dateNumber, font: event.target.value as CalendarTextFont } })}><option value="aventa">Aventa</option><option value="morganite">Morganite</option><option value="pingfang">平方上上谦体</option><option value="bailutong">白路彤彤手写体</option></select></label>
          <label>颜色<span className={styles.colorControl}><input type="color" value={layout.dateNumber.color} onChange={(event) => setLayout({ ...layout, dateNumber: { ...layout.dateNumber, color: event.target.value } })} /><output>{layout.dateNumber.color}</output></span></label>
        </fieldset>
      </section>
      <p className={styles.editorHint}>拖动对象本身调整位置；文字框拖动边缘改变长宽，贴纸拖动四角缩放、顶部圆点旋转。方向键可精调位置，按住 Shift 加速。</p>
      <div className={styles.saveBar}><button type="button" className={styles.primaryButton} disabled={busy} onClick={save}>{busy ? "保存中…" : "保存到日历"}</button></div>
      {message ? <p className={styles.helper}>{message}</p> : null}
    </div>
  </div>;
}
