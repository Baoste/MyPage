"use client";
/* eslint-disable @next/next/no-img-element -- authenticated same-origin media must remain canvas-readable */

import { useEffect, useMemo, useRef, useState } from "react";
import { CALENDAR_MAX_IMAGES, type CalendarDayPayload, type CalendarEntryView, type CalendarMonthDay, type CalendarTextFont } from "@/lib/calendar/contracts";
import styles from "./CalendarPage.module.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FONT_FAMILIES: Record<CalendarTextFont, string> = {
  aventa: 'var(--font-aventa), "Microsoft YaHei", sans-serif',
  morganite: 'var(--font-morganite), "Microsoft YaHei", sans-serif',
};
type PointLayer = { type: "text" } | { type: "sticker"; index: number };

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || "请求失败。");
  return body as T;
}
function preview(entry: CalendarEntryView | null) {
  return entry?.assets.find((asset) => asset.role === "preview")?.url;
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
  const [error, setError] = useState("");
  const first = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellCount = Math.ceil((first + count) / 7) * 7;
  const dayMap = useMemo(() => new Map(days.map((item) => [item.date, item])), [days]);
  const grid = Array.from({ length: cellCount }, (_, index) => {
    const value = index - first + 1;
    return value >= 1 && value <= count ? value : null;
  });

  async function open(value: string) {
    setOpenDate(value);
    setLoading(true);
    setError("");
    setDay(null);
    try {
      setDay(await jsonRequest(`/api/private/calendar/days/${value}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取当天内容。");
    } finally {
      setLoading(false);
    }
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
            return <button key={date} type="button" className={`${styles.dayCell} ${active ? styles.hasContent : ""} ${isToday ? styles.today : ""}`} onClick={() => active && open(date)} disabled={!active} aria-label={`${date}${active ? `，${info?.photoCount ?? 0} 张照片，${info?.foodCount ?? 0} 条美食记录` : "，暂无内容"}`}>
              {image ? <img src={image} alt="" className={styles.cellPreview} /> : null}
              <time dateTime={date} className={styles.dayNumber} style={dateNumberStyle ? { color: dateNumberStyle.color, fontFamily: FONT_FAMILIES[dateNumberStyle.font] } : undefined}>{value}</time>
              {info?.entry && !image ? <span className={styles.entryState}>{info.entry.status === "ready" ? "已保存" : info.entry.status === "failed" ? "生成失败" : "草稿"}</span> : null}
              {active && !image ? <span className={styles.sourceDots} aria-hidden="true">{info?.photoCount ? "PHOTO" : ""}{info?.foodCount ? " FOOD" : ""}</span> : null}
            </button>;
          })}
        </div>
      </div>
    </div>
    {openDate ? <DayDialog key={`${openDate}-${loading}`} date={openDate} day={day} loading={loading} error={error} onClose={() => setOpenDate(null)} onEntryChange={entryChanged} onEntryDelete={entryDeleted} /> : null}
  </>;
}

function DayDialog({ date, day, loading, error, onClose, onEntryChange, onEntryDelete }: {
  date: string;
  day: CalendarDayPayload | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onEntryChange: (entry: CalendarEntryView) => void;
  onEntryDelete: (date: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit">(() => day?.entry?.layout ? "view" : "edit");
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

  return <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="day-dialog-title" className={`${styles.dialog} ${mode === "view" ? styles.viewerDialog : ""}`}>
      <header className={styles.dialogHeader}>
        <div><p>{mode === "view" ? "Journal page" : "Daily archive"}</p><h2 id="day-dialog-title">{date}</h2></div>
        <button type="button" onClick={onClose} aria-label="关闭">×</button>
      </header>
      {loading ? <p className={styles.dialogStatus}>正在翻找这一天…</p> : error ? <p className={styles.dialogStatus}>{error}</p> : day?.entry?.layout && mode === "view" ? <JournalViewer entry={day.entry} busy={busy} message={message} onEdit={() => setMode("edit")} onDelete={removeEntry} /> : day ? <div className={styles.dialogBody}>
        <div className={styles.sourceColumn}>
          <p className={styles.sectionLabel}>当天素材 · 已选 {selectedImages.length}/{CALENDAR_MAX_IMAGES} 张图片</p>
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
          <label className={styles.noteField}><span>写给 AI 的补充</span><textarea value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} placeholder="心情、想强调的片段，或不希望出现的内容…" /></label>
          <button className={styles.primaryButton} type="button" disabled={busy || !day.aiAvailable || day.sources.length === 0} onClick={generate}>{busy ? "生成中，请稍候…" : day.entry ? "重新生成" : "生成 Cover、文字与贴纸"}</button>
          {!day.aiAvailable ? <p className={styles.helper}>服务端尚未配置 CALENDAR_AI_API_KEY。</p> : null}
          {message ? <p className={styles.helper}>{message}</p> : null}
        </div>
      </div> : null}
    </section>
  </div>;
}

function JournalViewer({ entry, busy, message, onEdit, onDelete }: { entry: CalendarEntryView; busy: boolean; message: string; onEdit: () => void; onDelete: () => void }) {
  const previewAsset = entry.assets.find((asset) => asset.role === "preview");
  const coverAsset = entry.assets.find((asset) => asset.role === "cover");
  const layout = entry.layout;
  return <div className={styles.viewer}>
    {previewAsset ? <div className={styles.viewerArtwork}><img src={previewAsset.url} alt={`${entry.date} 手账`} /></div> : layout ? <div className={styles.viewerArtwork} style={{ backgroundImage: coverAsset ? `url(${coverAsset.url})` : undefined, backgroundPosition: `${layout.cover.cropX * 100}% ${layout.cover.cropY * 100}%`, backgroundSize: `${layout.cover.scale * 100}%` }}>
      <div className={styles.viewerText} style={{ left: `${layout.text.x * 100}%`, top: `${layout.text.y * 100}%`, width: `${layout.text.width * 100}%`, color: layout.text.style.color, textAlign: layout.text.style.align, fontFamily: FONT_FAMILIES[layout.text.style.font] }}>{entry.finalText}</div>
      {layout.stickers.map((sticker) => { const asset = entry.assets.find((item) => item.id === sticker.assetId); return asset ? <img className={styles.viewerSticker} src={asset.url} alt="" key={sticker.assetId} style={{ left: `${sticker.x * 100}%`, top: `${sticker.y * 100}%`, width: `${sticker.width * 100}%`, transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)` }} /> : null; })}
    </div> : <div className={styles.viewerArtwork}><p>手账预览暂不可用。</p></div>}
    <div className={styles.viewerActions}>
      <button type="button" className={styles.secondaryButton} onClick={onEdit} disabled={busy}>编辑</button>
      <button type="button" className={styles.deleteButton} onClick={onDelete} disabled={busy}>{busy ? "删除中…" : "删除"}</button>
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

  function changePoint(layer: PointLayer, x: number, y: number) {
    setLayout((current) => layer.type === "text"
      ? { ...current, text: { ...current.text, x, y } }
      : { ...current, stickers: current.stickers.map((item, index) => index === layer.index ? { ...item, x, y } : item) });
  }
  function pointerDown(event: React.PointerEvent, layer: PointLayer) {
    event.preventDefault();
    setSelected(layer);
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    const rect = canvasRef.current!.getBoundingClientRect();
    const move = (next: PointerEvent) => changePoint(layer, Math.max(0, Math.min(1, (next.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (next.clientY - rect.top) / rect.height)));
    const end = () => { target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", end); };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
  }
  function keyMove(event: React.KeyboardEvent, layer: PointLayer) {
    const current = layer.type === "text" ? layout.text : layout.stickers[layer.index];
    const step = event.shiftKey ? .04 : .01;
    const delta = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[event.key];
    if (!delta) return;
    event.preventDefault();
    changePoint(layer, Math.max(0, Math.min(1, current.x + delta[0])), Math.max(0, Math.min(1, current.y + delta[1])));
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
    const cssVariable = layout.text.style.font === "morganite" ? "--font-morganite" : "--font-aventa";
    const loadedFamily = getComputedStyle(document.documentElement).getPropertyValue(cssVariable).trim() || "sans-serif";
    context.fillStyle = layout.text.style.color;
    context.font = `${layout.text.style.font === "morganite" ? 52 : 42}px ${loadedFamily}, "Microsoft YaHei", sans-serif`;
    context.textAlign = layout.text.style.align;
    context.shadowColor = "rgba(0,0,0,.35)"; context.shadowBlur = 8;
    const maxWidth = layout.text.width * 1024;
    const lines: string[] = [];
    let line = "";
    for (const word of Array.from(text)) {
      const test = line + word;
      if (context.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
    const anchor = layout.text.style.align === "left" ? 0 : layout.text.style.align === "center" ? maxWidth / 2 : maxWidth;
    lines.slice(0, 6).forEach((value, index) => context.fillText(value, layout.text.x * 1024 + anchor, layout.text.y * 1024 + index * 56, maxWidth));
    return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("无法创建预览图。")), "image/png"));
  }
  async function save() {
    setBusy(true); setMessage("");
    try {
      const blob = await renderPreview();
      const previewResponse = await fetch(`/api/private/calendar/entries/${entry.id}/preview`, { method: "PUT", headers: { "Content-Type": "image/png" }, body: blob });
      if (!previewResponse.ok) throw new Error("预览图保存失败。");
      const result = await jsonRequest<{ entry: CalendarEntryView }>(`/api/private/calendar/entries/${entry.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finalText: text, layout, updatedAt: entry.updatedAt }) });
      onSaved(result.entry);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "保存失败。");
    } finally {
      setBusy(false);
    }
  }
  const activeIndex = selected.type === "sticker" ? selected.index : -1;
  const active = activeIndex >= 0 ? layout.stickers[activeIndex] : null;

  return <div className={styles.editor}>
    <div className={styles.canvas} ref={canvasRef} style={{ backgroundImage: cover ? `url(${cover.url})` : undefined, backgroundPosition: `${layout.cover.cropX * 100}% ${layout.cover.cropY * 100}%`, backgroundSize: `${layout.cover.scale * 100}%` }}>
      <button type="button" className={`${styles.textLayer} ${selected.type === "text" ? styles.selectedLayer : ""}`} style={{ left: `${layout.text.x * 100}%`, top: `${layout.text.y * 100}%`, width: `${layout.text.width * 100}%`, color: layout.text.style.color, textAlign: layout.text.style.align, fontFamily: FONT_FAMILIES[layout.text.style.font] }} onPointerDown={(event) => pointerDown(event, { type: "text" })} onKeyDown={(event) => keyMove(event, { type: "text" })}>{text}</button>
      {stickers.map((sticker, index) => <button type="button" key={sticker.assetId} className={`${styles.stickerLayer} ${selected.type === "sticker" && selected.index === index ? styles.selectedLayer : ""}`} style={{ left: `${sticker.x * 100}%`, top: `${sticker.y * 100}%`, width: `${sticker.width * 100}%`, transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)` }} onPointerDown={(event) => pointerDown(event, { type: "sticker", index })} onKeyDown={(event) => keyMove(event, { type: "sticker", index })}><img src={sticker.asset!.url} alt={`贴纸 ${index + 1}`} /></button>)}
    </div>
    <div className={styles.editorControls}>
      <label>手账文字<textarea value={text} maxLength={4000} onChange={(event) => setText(event.target.value)} /></label>
      <div className={styles.textStyleControls}>
        <label>字体<select value={layout.text.style.font} onChange={(event) => setLayout({ ...layout, text: { ...layout.text, style: { ...layout.text.style, font: event.target.value as CalendarTextFont } } })}><option value="aventa">Aventa</option><option value="morganite">Morganite</option></select></label>
        <label>颜色<span className={styles.colorControl}><input type="color" value={layout.text.style.color} onChange={(event) => setLayout({ ...layout, text: { ...layout.text, style: { ...layout.text.style, color: event.target.value } } })} /><output>{layout.text.style.color}</output></span></label>
        <label>对齐<select value={layout.text.style.align} onChange={(event) => setLayout({ ...layout, text: { ...layout.text, style: { ...layout.text.style, align: event.target.value as "left" | "center" | "right" } } })}><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select></label>
      </div>
      <fieldset className={styles.dateStyleControls}>
        <legend>日历日期数字</legend>
        <label>字体<select value={layout.dateNumber.font} onChange={(event) => setLayout({ ...layout, dateNumber: { ...layout.dateNumber, font: event.target.value as CalendarTextFont } })}><option value="aventa">Aventa</option><option value="morganite">Morganite</option></select></label>
        <label>颜色<span className={styles.colorControl}><input type="color" value={layout.dateNumber.color} onChange={(event) => setLayout({ ...layout, dateNumber: { ...layout.dateNumber, color: event.target.value } })} /><output>{layout.dateNumber.color}</output></span></label>
      </fieldset>
      <div className={styles.controlRow}>
        <label>Cover 缩放<input type="range" min="1" max="4" step=".05" value={layout.cover.scale} onChange={(event) => setLayout({ ...layout, cover: { ...layout.cover, scale: Number(event.target.value) } })} /></label>
        {active ? <><label>贴纸大小<input type="range" min=".05" max=".7" step=".01" value={active.width} onChange={(event) => setLayout({ ...layout, stickers: layout.stickers.map((item, index) => index === activeIndex ? { ...item, width: Number(event.target.value) } : item) })} /></label><label>旋转<input type="range" min="-180" max="180" value={active.rotation} onChange={(event) => setLayout({ ...layout, stickers: layout.stickers.map((item, index) => index === activeIndex ? { ...item, rotation: Number(event.target.value) } : item) })} /></label></> : null}
      </div>
      <p className={styles.helper}>拖动图层；聚焦后用方向键精调，Shift + 方向键快速移动。</p>
      <button type="button" className={styles.primaryButton} disabled={busy} onClick={save}>{busy ? "保存中…" : "保存到日历"}</button>
      {message ? <p className={styles.helper}>{message}</p> : null}
    </div>
  </div>;
}
