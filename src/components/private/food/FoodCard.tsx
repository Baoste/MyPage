"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { foodLocationLabel, formatFoodDateTime } from "@/components/private/food/food-format";
import type { FoodGroupViewModel, FoodImageViewModel } from "@/types";

const LONG_PRESS_MILLISECONDS = 450;
const MOVEMENT_TOLERANCE = 10;
const GRID_ROW_HEIGHT = 8;
const GRID_GAP = 12;

interface FoodCardProps {
  group: FoodGroupViewModel;
  image: FoodImageViewModel;
  imageIndex: number;
  onOpenDetails: (trigger: HTMLElement) => void;
}

export function FoodCard({ group, image, imageIndex, onOpenDetails }: FoodCardProps) {
  const articleRef = useRef<HTMLElement>(null);
  const pressTimerRef = useRef<number | null>(null);
  const pressOriginRef = useRef({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [rowSpan, setRowSpan] = useState(24);
  const [imageUrl, setImageUrl] = useState(image.imageUrl);
  const [hasImageError, setHasImageError] = useState(!image.imageUrl);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const displayRatio = Math.min(1.55, Math.max(0.78, image.height / image.width));

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const update = () => {
      const targetHeight = article.getBoundingClientRect().width * displayRatio;
      setRowSpan(Math.max(8, Math.ceil((targetHeight + GRID_GAP) / (GRID_ROW_HEIGHT + GRID_GAP))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(article);
    return () => observer.disconnect();
  }, [displayRatio]);

  function clearPressTimer() {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pressOriginRef.current = { x: event.clientX, y: event.clientY };
    const trigger = event.currentTarget;
    trigger.setPointerCapture(event.pointerId);
    clearPressTimer();
    pressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true;
      if (navigator.vibrate) navigator.vibrate(18);
      onOpenDetails(trigger);
    }, LONG_PRESS_MILLISECONDS);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const distance = Math.hypot(
      event.clientX - pressOriginRef.current.x,
      event.clientY - pressOriginRef.current.y,
    );
    if (distance > MOVEMENT_TOLERANCE) clearPressTimer();
  }

  function handleClick() {
    clearPressTimer();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (hasImageError) {
      void refreshImage();
      return;
    }
    setIsFlipped((current) => !current);
  }

  async function refreshImage() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/private/food/images/${image.id}/url`, { cache: "no-store" });
      const data = await response.json() as { ok?: boolean; imageUrl?: string };
      if (!response.ok || !data.imageUrl) throw new Error("refresh failed");
      setImageUrl(data.imageUrl);
      setHasImageError(false);
    } catch {
      setHasImageError(true);
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <article
      ref={articleRef}
      className="food-card relative min-w-0"
      style={{ gridRowEnd: `span ${rowSpan}` }}
    >
      <button
        type="button"
        aria-label={`${group.category}，第 ${imageIndex + 1} 张，共 ${group.images.length} 张；点击翻转，长按查看详情`}
        aria-pressed={isFlipped}
        className="food-card-button absolute inset-0 block h-full w-full touch-pan-y text-left"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={clearPressTimer}
        onPointerCancel={clearPressTimer}
        onLostPointerCapture={clearPressTimer}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className={`food-card-inner block h-full w-full ${isFlipped ? "is-flipped" : ""}`}>
          <span className="food-card-face food-card-front block bg-[#ddd7ca]">
            {!hasImageError && imageUrl ? (
              <Image
                unoptimized
                src={imageUrl}
                alt={`${group.category}，第 ${imageIndex + 1} 张，共 ${group.images.length} 张`}
                width={image.width}
                height={image.height}
                sizes="(max-width: 359px) 100vw, (max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
                className="h-full w-full object-cover"
                onError={() => setHasImageError(true)}
              />
            ) : (
              <span className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-xs text-[#6f675e]">
                <span>图片暂时无法显示</span>
                <span className="border-b border-current pb-0.5 font-semibold">
                  {isRefreshing ? "正在重试…" : "点击重试"}
                </span>
              </span>
            )}
          </span>
          <span className="food-card-face food-card-back flex flex-col justify-between bg-[#292d27] p-4 text-[#f4f0e7] sm:p-5">
            <span>
              <span className="block text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-[#adb6a4]">Food memory</span>
              <span className="display-type mt-3 block text-[clamp(1.3rem,2.4vw,2rem)] leading-none">{group.category}</span>
            </span>
            <span className="block space-y-2 text-[0.66rem] leading-5 text-[#d9dbd1] sm:text-xs">
              <span className="block line-clamp-2">{foodLocationLabel(group)}</span>
              <span className="block">{formatFoodDateTime(group)}</span>
            </span>
          </span>
        </span>
      </button>
      {isFlipped ? (
        <button
          type="button"
          className="absolute bottom-3 right-3 z-20 border-b border-[#d9dbd1] pb-0.5 text-[0.6rem] font-semibold tracking-[0.12em] text-[#f4f0e7]"
          onClick={(event) => onOpenDetails(event.currentTarget)}
        >
          查看详情
        </button>
      ) : null}
    </article>
  );
}
