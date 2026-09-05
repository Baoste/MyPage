"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FoodLocationPicker } from "@/components/private/food/FoodLocationPicker";
import {
  FOOD_TIMEZONE,
  type FoodApiErrorResponse,
  type FoodGroupUpdateInput,
} from "@/lib/food/contracts";
import { chinaDateTimeLocalToIso, toDateTimeLocalValue } from "@/lib/food/image-metadata";
import { chineseLocationText } from "@/lib/food/locations";
import {
  editableImageFormData,
  prepareEditableImage,
} from "@/lib/image/editable-client";
import { animatePrivateDialogClose } from "@/lib/motion";
import type { FoodGroupViewModel, FoodImageViewModel, FoodLocation, FoodRating } from "@/types";

interface FoodEditDialogProps {
  group: FoodGroupViewModel;
  onClose: () => void;
  onSaved: () => void;
}

function responseMessage(value: unknown) {
  return typeof value === "object" && value !== null && "message" in value
    && typeof (value as { message?: unknown }).message === "string"
    ? (value as { message: string }).message
    : "修改失败，请稍后再试。";
}

function initialLocation(group: FoodGroupViewModel): FoodLocation {
  return {
    ...group.location,
    countryName: chineseLocationText(group.location.countryName),
    regionName: group.location.regionName
      ? chineseLocationText(group.location.regionName) || undefined
      : undefined,
    cityName: chineseLocationText(group.location.cityName),
  };
}

export function FoodEditDialog({ group, onClose, onSaved }: FoodEditDialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const addImageInputRef = useRef<HTMLInputElement>(null);
  const imagesChangedRef = useRef(false);
  const [category, setCategory] = useState(group.category);
  const [review, setReview] = useState(group.review ?? "");
  const [rating, setRating] = useState<FoodRating | 0>(group.rating ?? 0);
  const [location, setLocation] = useState<FoodLocation>(() => initialLocation(group));
  const [occurredAtLocal, setOccurredAtLocal] = useState(() =>
    toDateTimeLocalValue(group.occurredAt));
  const [images, setImages] = useState(group.images);
  const [isEditingImages, setIsEditingImages] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
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
      if (dialog.open) dialog.close();
    };
  }, []);

  async function addImages(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = [...fileList];
    if (images.length + files.length > 12) return setMessage("每组最多保存 12 张图片。");
    setIsEditingImages(true);
    setMessage("正在添加图片…");
    try {
      for (const file of files) {
        const prepared = await prepareEditableImage(file);
        try {
          const response = await fetch(`/api/private/food/groups/${group.id}/images`, {
            method: "POST",
            body: editableImageFormData(prepared),
          });
          const data = await response.json() as { ok?: boolean; message?: string; image?: FoodImageViewModel };
          if (!response.ok || !data.ok || !data.image) throw new Error(responseMessage(data));
          setImages((current) => [...current, data.image!]);
          imagesChangedRef.current = true;
        } finally {
          URL.revokeObjectURL(prepared.previewUrl);
        }
      }
      setMessage("图片已添加。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "添加图片失败，请稍后再试。");
    } finally {
      setIsEditingImages(false);
      if (addImageInputRef.current) addImageInputRef.current.value = "";
    }
  }

  async function replaceImage(imageId: string, file: File | undefined) {
    if (!file) return;
    setIsEditingImages(true);
    setMessage("正在替换图片…");
    try {
      const prepared = await prepareEditableImage(file);
      try {
        const response = await fetch(`/api/private/food/groups/${group.id}/images/${imageId}`, {
          method: "PUT",
          body: editableImageFormData(prepared),
        });
        const data = await response.json() as { ok?: boolean; message?: string; image?: FoodImageViewModel };
        if (!response.ok || !data.ok || !data.image) throw new Error(responseMessage(data));
        setImages((current) => current.map((image) => image.id === imageId ? data.image! : image));
        imagesChangedRef.current = true;
      } finally {
        URL.revokeObjectURL(prepared.previewUrl);
      }
      setMessage("图片已替换。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "替换图片失败，请稍后再试。");
    } finally {
      setIsEditingImages(false);
    }
  }

  async function removeImage(image: FoodImageViewModel) {
    if (images.length <= 1) return setMessage("每组至少保留一张图片；如需全部删除，请删除整组记录。");
    if (!window.confirm("确定删除这张图片吗？删除后无法恢复。")) return;
    setIsEditingImages(true);
    setMessage("正在删除图片…");
    try {
      const response = await fetch(`/api/private/food/groups/${group.id}/images/${image.id}`, { method: "DELETE" });
      const data = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) throw new Error(responseMessage(data));
      setImages((current) => current.filter((item) => item.id !== image.id));
      imagesChangedRef.current = true;
      setMessage("图片已删除。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除图片失败，请稍后再试。");
    } finally {
      setIsEditingImages(false);
    }
  }

  async function requestClose() {
    if (isSaving || isEditingImages || dialogRef.current?.dataset.closing) return;
    if (isDirty && !window.confirm("放弃尚未保存的修改吗？")) return;
    await animatePrivateDialogClose(dialogRef.current);
    onClose();
    if (imagesChangedRef.current) router.refresh();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const occurredAt = chinaDateTimeLocalToIso(occurredAtLocal);
    if (!category.trim()) return setMessage("请填写分类。");
    if (!location.countryCode || !location.cityName) return setMessage("请选择国家并填写中文城市。");
    if (!occurredAt) return setMessage("请选择有效的发生时间。");
    if (!rating) return setMessage("请选择 1～5 星评分。");

    const payload: FoodGroupUpdateInput = {
      category,
      review: review || undefined,
      rating,
      occurredAt,
      timezone: FOOD_TIMEZONE,
      location,
    };

    setIsSaving(true);
    setMessage("正在保存修改…");
    try {
      const response = await fetch(`/api/private/food/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as { ok?: boolean } | FoodApiErrorResponse;
      if (!response.ok || !data.ok) throw new Error(responseMessage(data));
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
      aria-labelledby="food-edit-title"
      className="food-edit-dialog m-auto h-[min(92svh,47rem)] w-[min(94vw,46rem)] max-w-none overflow-hidden border-0 bg-[#f3eee6] p-0 text-[#302d29] shadow-2xl"
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
            <p className="eyebrow">Edit food memory</p>
            <h2 id="food-edit-title" className="display-type mt-2 text-3xl sm:text-4xl">修改记录</h2>
          </div>
          <button type="button" disabled={isSaving || isEditingImages} onClick={() => void requestClose()} aria-label="关闭修改美食记录" className="grid size-11 shrink-0 place-items-center rounded-full border border-[#bcb3a8] bg-[#fffdf8] text-xl disabled:opacity-40">×</button>
        </header>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-8">
          <fieldset disabled={isSaving || isEditingImages}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <legend className="text-xs font-semibold text-[#5d554e]">组内图片</legend>
                <p className="mt-1 text-[0.66rem] leading-5 text-[#7b736a]">可添加、替换或删除，至少保留一张，最多 12 张。</p>
              </div>
              <label className={`shrink-0 rounded-full border border-[#9e9488] px-3.5 py-2 text-xs font-semibold text-[#4a433d] ${isSaving || isEditingImages || images.length >= 12 ? "pointer-events-none opacity-45" : "cursor-pointer"}`}>
                添加图片
                <input ref={addImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={images.length >= 12} className="sr-only" onChange={(event) => void addImages(event.target.files)} />
              </label>
            </div>
            <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((image, index) => <li key={image.id} className="min-w-0 rounded-2xl border border-[#d0c7bb] bg-[#f7f3ec] p-2">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-[#ddd7ca]">
                  <Image unoptimized src={image.thumbnailUrl || image.imageUrl} alt={`组内第 ${index + 1} 张图片`} fill sizes="10rem" className="object-cover" />
                  <span className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-[#252822] text-[0.62rem] font-semibold text-white">{index + 1}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[0.62rem] font-semibold">
                  <label className="cursor-pointer border-b border-current text-[#5e574f]">替换<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    void replaceImage(image.id, file);
                  }} /></label>
                  <button type="button" disabled={images.length <= 1} onClick={() => void removeImage(image)} className="border-b border-current text-[#8d3024] disabled:cursor-not-allowed disabled:opacity-30">删除</button>
                </div>
              </li>)}
            </ol>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
            <label className="block text-xs font-semibold text-[#5d554e]">
              分类
              <input value={category} onChange={(event) => { setCategory(event.target.value); setIsDirty(true); }} disabled={isSaving} required maxLength={40} className="mt-2 w-full rounded-xl border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal text-[#302d29]" />
            </label>
            <fieldset disabled={isSaving}>
              <legend className="text-xs font-semibold text-[#5d554e]">评分</legend>
              <div className="mt-2 flex h-[42px] items-center gap-1 rounded-xl border border-[#bdb3a7] bg-[#fbf8f2] px-3" role="radiogroup" aria-label="评分">
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value} className="cursor-pointer">
                    <input type="radio" name="food-edit-rating" value={value} checked={rating === value} onChange={() => { setRating(value as FoodRating); setIsDirty(true); }} className="sr-only" />
                    <span aria-hidden="true" className={`text-xl ${rating >= value ? "text-[#a64b2a]" : "text-[#c9c0b4]"}`}>★</span>
                    <span className="sr-only">{value} 星</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <FoodLocationPicker value={location} disabled={isSaving} onChange={(next) => { setLocation(next); setIsDirty(true); }} />

          <label className="block text-xs font-semibold text-[#5d554e]">
            发生时间
            <input type="datetime-local" value={occurredAtLocal} onChange={(event) => { setOccurredAtLocal(event.target.value); setIsDirty(true); }} disabled={isSaving} required className="mt-2 w-full rounded-xl border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal text-[#302d29]" />
            <span className="mt-1 block text-[0.66rem] font-normal leading-5 text-[#7b736a]">固定为中国北京时间（{FOOD_TIMEZONE}）</span>
          </label>

          <label className="block text-xs font-semibold text-[#5d554e]">
            点评
            <textarea value={review} onChange={(event) => { setReview(event.target.value); setIsDirty(true); }} disabled={isSaving} maxLength={2000} rows={5} className="mt-2 w-full resize-y rounded-xl border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal leading-6 text-[#302d29]" />
            <span className="mt-1 block text-right text-[0.62rem] font-normal text-[#81796f]">{review.length} / 2000</span>
          </label>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#cec5b8] bg-[#eee8de] px-5 py-4 sm:px-8">
          <p aria-live="polite" className="min-w-0 flex-1 text-xs leading-5 text-[#96392c]">{message}</p>
          <button type="submit" disabled={isSaving || isEditingImages} className="min-w-32 rounded-full bg-[#2e332c] px-5 py-3 text-xs font-semibold tracking-[0.1em] text-white disabled:opacity-50">
            {isSaving ? "保存中…" : "保存修改"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
