"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  formatPhotoDateTime,
  photoLocationLabel,
} from "@/components/private/photos/photo-format";
import type { PhotoImageViewModel, PhotoViewModel } from "@/types";

const LONG_PRESS_MILLISECONDS = 450;
const MOVEMENT_TOLERANCE = 10;
const FALLBACK_GRID_ROW_HEIGHT = 1;
const FALLBACK_CARD_GAP = 18;

interface PhotoCardProps {
  photo: PhotoViewModel;
  image: PhotoImageViewModel;
  imageIndex: number;
  isExpanded: boolean;
  onExpand: () => void;
  onElementChange: (photoId: string, element: HTMLElement | null) => void;
}

export function PhotoCard({
  photo,
  image,
  imageIndex,
  isExpanded,
  onExpand,
  onElementChange,
}: PhotoCardProps) {
  const articleRef = useRef<HTMLElement | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const pressTargetRef = useRef<HTMLButtonElement | null>(null);
  const suppressNextClickRef = useRef(false);
  const pressOriginRef = useRef({ x: 0, y: 0 });
  const [isFlipped, setIsFlipped] = useState(false);
  const [collapsedRowSpan, setCollapsedRowSpan] = useState(24);
  const [dimensions, setDimensions] = useState(() => ({
    width: Math.max(1, image.width),
    height: Math.max(1, image.height),
  }));
  const [imageUrl, setImageUrl] = useState(image.thumbnailUrl || image.imageUrl);
  const [hasImageError, setHasImageError] = useState(!(image.thumbnailUrl || image.imageUrl));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const displayRatio = dimensions.height / dimensions.width;

  const setArticleRef = useCallback((element: HTMLElement | null) => {
    articleRef.current = element;
    onElementChange(image.id, element);
  }, [image.id, onElementChange]);

  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const update = () => {
      const gridStyle = article.parentElement
        ? window.getComputedStyle(article.parentElement)
        : null;
      const parsedRowHeight = Number.parseFloat(gridStyle?.gridAutoRows ?? "");
      const parsedRowGap = Number.parseFloat(gridStyle?.rowGap ?? "");
      const parsedCardGap = Number.parseFloat(gridStyle?.columnGap ?? "");
      const rowHeight = Number.isFinite(parsedRowHeight) && parsedRowHeight > 0
        ? parsedRowHeight
        : FALLBACK_GRID_ROW_HEIGHT;
      const rowGap = Number.isFinite(parsedRowGap) && parsedRowGap >= 0 ? parsedRowGap : 0;
      const cardGap = Number.isFinite(parsedCardGap) && parsedCardGap >= 0
        ? parsedCardGap
        : FALLBACK_CARD_GAP;
      const targetHeight = article.getBoundingClientRect().width * displayRatio;
      const nextRowSpan = Math.max(
        1,
        Math.ceil((targetHeight + cardGap + rowGap) / (rowHeight + rowGap)),
      );
      setCollapsedRowSpan(nextRowSpan);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(article);
    return () => observer.disconnect();
  }, [displayRatio]);

  useEffect(() => () => {
    if (pressTimerRef.current !== null) window.clearTimeout(pressTimerRef.current);
    pressTargetRef.current?.classList.remove("is-pressing");
  }, []);

  function clearPressTimer() {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressTargetRef.current?.classList.remove("is-pressing");
    pressTargetRef.current = null;
  }

  function expandDetails() {
    clearPressTimer();
    setIsFlipped(false);
    onExpand();
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    clearPressTimer();
    suppressNextClickRef.current = false;
    pressOriginRef.current = { x: event.clientX, y: event.clientY };
    const trigger = event.currentTarget;
    pressTargetRef.current = trigger;
    trigger.classList.add("is-pressing");
    trigger.setPointerCapture(event.pointerId);
    pressTimerRef.current = window.setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(18);
      suppressNextClickRef.current = true;
      expandDetails();
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
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      clearPressTimer();
      return;
    }
    clearPressTimer();
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
      const response = await fetch(`/api/private/photos/images/${image.id}/url`, {
        cache: "no-store",
      });
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
      ref={setArticleRef}
      className="photo-card food-card relative min-w-0"
      style={{ gridRowEnd: `span ${collapsedRowSpan}` }}
    >
      <div
        className="food-card-compact relative w-full"
        style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
      >
        <button
          type="button"
          aria-label={`${photo.title ?? "无题照片"}，第 ${imageIndex + 1} 张，共 ${photo.images.length} 张；点击翻转，长按展开详情`}
          aria-pressed={isFlipped}
          aria-expanded={isExpanded}
          className="photo-card-button food-card-button absolute inset-0 block h-full w-full touch-pan-y text-left"
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
                  alt={photo.title ?? `拍摄于 ${formatPhotoDateTime(photo)}`}
                  width={dimensions.width}
                  height={dimensions.height}
                  sizes="(max-width: 359px) 100vw, (max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
                  className="h-full w-full object-contain"
                  onLoad={(event) => {
                    const { naturalWidth, naturalHeight } = event.currentTarget;
                    if (naturalWidth > 0 && naturalHeight > 0) {
                      setDimensions({ width: naturalWidth, height: naturalHeight });
                    }
                    setHasImageError(false);
                  }}
                  onError={() => setHasImageError(true)}
                />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-xs text-[#6f675e]">
                  <span>图片暂时无法显示</span>
                  <span className="font-semibold text-[#4f4942]">
                    {isRefreshing ? "正在重试…" : "点击重试"}
                  </span>
                </span>
              )}
              <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-[#f8f4ed] px-3 py-1.5 text-[0.62rem] font-semibold tracking-[0.03em] text-[#453f38] shadow-sm">
                {photo.title ?? "无题"}
              </span>
              {photo.images.length > 1 ? (
                <span className="absolute right-3 top-3 rounded-full bg-[#292d27] px-2.5 py-1 text-[0.58rem] font-semibold tabular-nums text-white shadow-sm">
                  {imageIndex + 1}/{photo.images.length}
                </span>
              ) : null}
            </span>
            <span className="food-card-face food-card-back flex flex-col justify-between bg-[#30352e] p-4 text-[#f5f1e8] sm:p-5">
              <span>
                <span className="block text-[0.58rem] font-semibold uppercase tracking-[0.17em] text-[#b9c0b2]">Photo memory</span>
                <span className="display-type mt-3 block text-[clamp(1.35rem,2.4vw,2rem)] leading-none">
                  {photo.title ?? "无题"}
                </span>
              </span>
              <span className="block space-y-1.5 pr-10 text-[0.66rem] leading-5 text-[#dfe2d8] sm:text-xs">
                <span className="block line-clamp-2">{photoLocationLabel(photo)}</span>
                <span className="block">{formatPhotoDateTime(photo)}</span>
                {photo.uploadedBy ? (
                  <span className="block text-[#b9c0b2]">上传者 · @{photo.uploadedBy.username}</span>
                ) : null}
                {photo.tags.length ? (
                  <span className="block truncate">{photo.tags.map((tag) => `#${tag}`).join(" ")}</span>
                ) : null}
              </span>
            </span>
          </span>
        </button>
        {isFlipped ? (
          <button
            type="button"
            className="absolute bottom-3 right-3 z-20 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[0.58rem] font-semibold tracking-[0.08em] text-[#f4f0e7] transition-colors hover:bg-white/20"
            onClick={expandDetails}
          >
            展开
          </button>
        ) : null}
      </div>
    </article>
  );
}
