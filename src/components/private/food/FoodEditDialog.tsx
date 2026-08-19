"use client";

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
import type { FoodGroupViewModel, FoodLocation, FoodRating } from "@/types";

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
  const [category, setCategory] = useState(group.category);
  const [review, setReview] = useState(group.review ?? "");
  const [rating, setRating] = useState<FoodRating | 0>(group.rating ?? 0);
  const [location, setLocation] = useState<FoodLocation>(() => initialLocation(group));
  const [occurredAtLocal, setOccurredAtLocal] = useState(() =>
    toDateTimeLocalValue(group.occurredAt));
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

  function requestClose() {
    if (isSaving) return;
    if (isDirty && !window.confirm("放弃尚未保存的修改吗？")) return;
    onClose();
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
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <form onSubmit={submit} className="flex h-full min-h-0 flex-col">
        <header className="flex items-start justify-between gap-6 border-b border-[#cec5b8] px-5 py-5 sm:px-8">
          <div>
            <p className="eyebrow">Edit food memory</p>
            <h2 id="food-edit-title" className="display-type mt-2 text-3xl sm:text-4xl">修改记录</h2>
          </div>
          <button type="button" disabled={isSaving} onClick={requestClose} aria-label="关闭修改美食记录" className="grid size-11 shrink-0 place-items-center rounded-full border border-[#bcb3a8] bg-[#fffdf8] text-xl disabled:opacity-40">×</button>
        </header>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-8">
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
          <button type="submit" disabled={isSaving} className="min-w-32 rounded-full bg-[#2e332c] px-5 py-3 text-xs font-semibold tracking-[0.1em] text-white disabled:opacity-50">
            {isSaving ? "保存中…" : "保存修改"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
