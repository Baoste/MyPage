"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { foodLocationLabel, formatFoodDateTime } from "@/components/private/food/food-format";
import type { FoodGroupViewModel } from "@/types";

interface FoodDetailDialogProps {
  group: FoodGroupViewModel;
  initialImageIndex: number;
  onClose: () => void;
}

export function FoodDetailDialog({ group, initialImageIndex, onClose }: FoodDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [imageIndex, setImageIndex] = useState(initialImageIndex);
  const image = group.images[imageIndex];

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

  function move(amount: number) {
    setImageIndex((current) => (current + amount + group.images.length) % group.images.length);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="food-detail-title"
      className="food-detail-dialog m-auto h-[min(92svh,54rem)] w-[min(94vw,76rem)] max-w-none overflow-hidden border-0 bg-[#181c18] p-0 text-[#f5f1e8] shadow-2xl"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" && group.images.length > 1) move(-1);
        if (event.key === "ArrowRight" && group.images.length > 1) move(1);
      }}
    >
      <div className="grid h-full min-h-0 md:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.72fr)]">
        <div className="relative flex min-h-[42svh] items-center justify-center bg-[#0f120f] p-4 md:min-h-0 md:p-8">
          {image?.imageUrl ? (
            <Image
              unoptimized
              src={image.imageUrl}
              alt={`${group.category}，第 ${imageIndex + 1} 张，共 ${group.images.length} 张`}
              width={image.width}
              height={image.height}
              sizes="(max-width: 767px) 94vw, 65vw"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <p className="text-sm text-[#aeb4aa]">图片暂时无法显示</p>
          )}
          {group.images.length > 1 ? (
            <>
              <button type="button" aria-label="上一张图片" onClick={() => move(-1)} className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center border border-white/30 bg-black/45 text-xl">←</button>
              <button type="button" aria-label="下一张图片" onClick={() => move(1)} className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center border border-white/30 bg-black/45 text-xl">→</button>
            </>
          ) : null}
        </div>
        <aside className="min-h-0 overflow-y-auto border-t border-white/10 bg-[#242922] p-6 md:border-l md:border-t-0 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#9fa995]">Food memory</p>
              <h2 id="food-detail-title" className="display-type mt-3 text-4xl">{group.category}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="关闭美食详情" className="grid size-11 shrink-0 place-items-center border border-white/20 text-xl">×</button>
          </div>

          <dl className="mt-9 space-y-5 border-y border-white/12 py-6 text-sm">
            <div><dt className="text-[0.58rem] uppercase tracking-[0.18em] text-[#9fa995]">地点</dt><dd className="mt-2 leading-6">{foodLocationLabel(group)}</dd></div>
            <div><dt className="text-[0.58rem] uppercase tracking-[0.18em] text-[#9fa995]">时间</dt><dd className="mt-2">{formatFoodDateTime(group)}</dd></div>
            <div><dt className="text-[0.58rem] uppercase tracking-[0.18em] text-[#9fa995]">评分</dt><dd className="mt-2 tracking-[0.16em]" aria-label={group.rating ? `${group.rating} 星` : "未评分"}>{group.rating ? `${"★".repeat(group.rating)}${"☆".repeat(5 - group.rating)}` : "未评分"}</dd></div>
          </dl>

          <div className="mt-7">
            <p className="text-[0.58rem] uppercase tracking-[0.18em] text-[#9fa995]">点评</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#e0e2da]">{group.review || "这次还没有留下点评。"}</p>
          </div>

          {group.images.length > 1 ? (
            <div className="mt-8 grid grid-cols-4 gap-2" aria-label="同组图片">
              {group.images.map((item, index) => (
                <button key={item.id} type="button" aria-label={`查看第 ${index + 1} 张图片`} aria-current={index === imageIndex ? "true" : undefined} onClick={() => setImageIndex(index)} className={`relative aspect-square overflow-hidden border ${index === imageIndex ? "border-[#f5f1e8]" : "border-transparent opacity-65"}`}>
                  {item.imageUrl ? <Image unoptimized src={item.imageUrl} alt="" fill sizes="6rem" className="object-cover" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </dialog>
  );
}
