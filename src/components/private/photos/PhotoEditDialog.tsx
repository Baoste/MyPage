"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FoodLocationPicker } from "@/components/private/food/FoodLocationPicker";
import { chinaDateTimeLocalToIso, toDateTimeLocalValue } from "@/lib/food/image-metadata";
import { chineseLocationText } from "@/lib/food/locations";
import {
  editableImageFormData,
  prepareEditableImage,
  type PreparedEditableImage,
} from "@/lib/image/editable-client";
import {
  PHOTO_TIMEZONE,
  type PhotoApiErrorResponse,
  type PhotoUpdateInput,
} from "@/lib/photo/contracts";
import { animatePrivateDialogClose } from "@/lib/motion";
import type { FoodLocation, PhotoViewModel } from "@/types";

function responseMessage(value: unknown) {
  return typeof value === "object" && value !== null && "message" in value
    && typeof (value as { message?: unknown }).message === "string"
    ? (value as { message: string }).message
    : "修改失败，请稍后再试。";
}

function initialLocation(photo: PhotoViewModel): FoodLocation {
  return {
    ...photo.location,
    countryName: chineseLocationText(photo.location.countryName),
    regionName: photo.location.regionName
      ? chineseLocationText(photo.location.regionName) || undefined
      : undefined,
    cityName: chineseLocationText(photo.location.cityName),
  };
}

function parseTags(value: string) {
  return [...new Set(value.split(/[,，\n]+/u).map((tag) => tag.trim()).filter(Boolean))];
}

export function PhotoEditDialog({
  photo,
  onClose,
  onSaved,
}: {
  photo: PhotoViewModel;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const replacementRef = useRef<PreparedEditableImage | null>(null);
  const [title, setTitle] = useState(photo.title ?? "");
  const [description, setDescription] = useState(photo.description ?? "");
  const [location, setLocation] = useState<FoodLocation>(() => initialLocation(photo));
  const [occurredAtLocal, setOccurredAtLocal] = useState(() =>
    toDateTimeLocalValue(photo.occurredAt));
  const [tagsText, setTagsText] = useState(photo.tags.join("，"));
  const [isDirty, setIsDirty] = useState(false);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [replacement, setReplacement] = useState<PreparedEditableImage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (replacementRef.current) URL.revokeObjectURL(replacementRef.current.previewUrl);
      if (dialog.open) dialog.close();
    };
  }, []);

  async function chooseReplacement(file: File | undefined) {
    if (!file) return;
    setIsPreparingImage(true);
    setMessage("正在读取新图片…");
    try {
      const next = await prepareEditableImage(file);
      if (replacementRef.current) URL.revokeObjectURL(replacementRef.current.previewUrl);
      replacementRef.current = next;
      setReplacement(next);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法读取选择的图片。");
    } finally {
      setIsPreparingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function cancelReplacement() {
    if (replacementRef.current) URL.revokeObjectURL(replacementRef.current.previewUrl);
    replacementRef.current = null;
    setReplacement(null);
    setMessage("");
  }

  async function requestClose() {
    if (isSaving || isPreparingImage || dialogRef.current?.dataset.closing) return;
    if ((isDirty || replacementRef.current) && !window.confirm("放弃尚未保存的修改吗？")) return;
    await animatePrivateDialogClose(dialogRef.current);
    onClose();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const occurredAt = chinaDateTimeLocalToIso(occurredAtLocal);
    const tags = parseTags(tagsText);
    if (!location.countryCode || !location.cityName) return setMessage("请选择国家并填写中文城市。");
    if (!occurredAt) return setMessage("请选择有效的拍摄时间。");
    if (tags.length > 20 || tags.some((tag) => tag.length > 30)) {
      return setMessage("标签最多 20 个，每个最多 30 个字符。");
    }
    const payload: PhotoUpdateInput = {
      title: title || undefined,
      description: description || undefined,
      occurredAt,
      timezone: PHOTO_TIMEZONE,
      location,
      tags,
    };
    setIsSaving(true);
    setMessage("正在保存修改…");
    try {
      const response = await fetch(`/api/private/photos/entries/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as { ok?: boolean } | PhotoApiErrorResponse;
      if (!response.ok || !data.ok) throw new Error(responseMessage(data));
      if (replacement) {
        setMessage("正在替换图片…");
        const imageResponse = await fetch(`/api/private/photos/entries/${photo.id}/image`, {
          method: "PUT",
          body: editableImageFormData(replacement),
        });
        const imageData = await imageResponse.json() as { ok?: boolean; message?: string };
        if (!imageResponse.ok || !imageData.ok) throw new Error(responseMessage(imageData));
      }
      if (replacementRef.current) URL.revokeObjectURL(replacementRef.current.previewUrl);
      replacementRef.current = null;
      router.refresh();
      await animatePrivateDialogClose(dialogRef.current);
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "修改失败，请稍后再试。");
      setIsSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="photo-edit-title"
      className="photo-edit-dialog food-edit-dialog m-auto h-[min(92svh,50rem)] w-[min(94vw,46rem)] max-w-none overflow-hidden border-0 bg-[#f3eee6] p-0 text-[#302d29] shadow-2xl"
      onCancel={(event) => {
        event.preventDefault();
        void requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) void requestClose();
      }}
    >
      <form onSubmit={submit} className="flex h-full min-h-0 flex-col">
        <header className="flex items-start justify-between gap-6 border-b border-[#cec5b8] px-5 py-5 sm:px-8">
          <div>
            <p className="eyebrow">Edit photo memory</p>
            <h2 id="photo-edit-title" className="display-type mt-2 text-3xl sm:text-4xl">修改照片</h2>
          </div>
          <button type="button" disabled={isSaving || isPreparingImage} onClick={() => void requestClose()} aria-label="关闭修改照片" className="grid size-11 shrink-0 place-items-center rounded-full border border-[#bcb3a8] bg-[#fffdf8] text-xl disabled:opacity-40">×</button>
        </header>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-8">
          <fieldset disabled={isSaving || isPreparingImage}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <legend className="text-xs font-semibold text-[#5d554e]">图片</legend>
                <p className="mt-1 text-[0.66rem] leading-5 text-[#7b736a]">选择新图片即可替换，JPEG / PNG / WebP，最大 10MB。</p>
              </div>
              <label className={`shrink-0 rounded-full border border-[#9e9488] px-3.5 py-2 text-xs font-semibold text-[#4a433d] ${isSaving || isPreparingImage ? "pointer-events-none opacity-45" : "cursor-pointer"}`}>
                {isPreparingImage ? "读取中…" : replacement ? "重新选择" : "更换图片"}
                <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void chooseReplacement(event.target.files?.[0])} />
              </label>
            </div>
            <div className="mt-4 rounded-2xl border border-[#d0c7bb] bg-[#f7f3ec] p-2.5">
              <div className="relative min-h-44 overflow-hidden rounded-xl bg-[#ddd7ca]" style={{ aspectRatio: `${replacement?.width ?? photo.width} / ${replacement?.height ?? photo.height}` }}>
                <Image unoptimized src={replacement?.previewUrl || photo.thumbnailUrl || photo.imageUrl} alt="照片预览" fill sizes="40rem" className="object-contain" />
              </div>
              {replacement ? <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[0.66rem] text-[#71695f]"><span className="truncate">待保存 · {replacement.file.name}</span><button type="button" onClick={cancelReplacement} className="shrink-0 border-b border-current text-[#8d3024]">取消替换</button></div> : null}
            </div>
          </fieldset>

          <label className="block text-xs font-semibold text-[#5d554e]">
            标题
            <input value={title} onChange={(event) => { setTitle(event.target.value); setIsDirty(true); }} disabled={isSaving} maxLength={120} placeholder="可以留空" className="mt-2 w-full rounded-xl border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal text-[#302d29]" />
          </label>

          <FoodLocationPicker value={location} disabled={isSaving} onChange={(next) => { setLocation(next); setIsDirty(true); }} />

          <label className="block text-xs font-semibold text-[#5d554e]">
            拍摄时间
            <input type="datetime-local" value={occurredAtLocal} onChange={(event) => { setOccurredAtLocal(event.target.value); setIsDirty(true); }} disabled={isSaving} required className="mt-2 w-full rounded-xl border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal text-[#302d29]" />
            <span className="mt-1 block text-[0.66rem] font-normal leading-5 text-[#7b736a]">固定为中国北京时间（{PHOTO_TIMEZONE}）</span>
          </label>

          <label className="block text-xs font-semibold text-[#5d554e]">
            标签
            <input value={tagsText} onChange={(event) => { setTagsText(event.target.value); setIsDirty(true); }} disabled={isSaving} placeholder="旅行，家人，日常" className="mt-2 w-full rounded-xl border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal text-[#302d29]" />
            <span className="mt-1 block text-[0.66rem] font-normal text-[#81796f]">使用逗号分隔，最多 20 个。</span>
          </label>

          <label className="block text-xs font-semibold text-[#5d554e]">
            描述
            <textarea value={description} onChange={(event) => { setDescription(event.target.value); setIsDirty(true); }} disabled={isSaving} maxLength={2000} rows={5} className="mt-2 w-full resize-y rounded-xl border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal leading-6 text-[#302d29]" />
            <span className="mt-1 block text-right text-[0.62rem] font-normal text-[#81796f]">{description.length} / 2000</span>
          </label>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#cec5b8] bg-[#eee8de] px-5 py-4 sm:px-8">
          <p aria-live="polite" className="min-w-0 flex-1 text-xs leading-5 text-[#96392c]">{message}</p>
          <button type="submit" disabled={isSaving || isPreparingImage} className="min-w-32 rounded-full bg-[#2e332c] px-5 py-3 text-xs font-semibold tracking-[0.1em] text-white disabled:opacity-50">
            {isSaving ? "保存中…" : "保存修改"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
