"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FoodExpandedCard } from "@/components/private/food/FoodExpandedCard";
import { foodLocationLabel, formatFoodDateTime } from "@/components/private/food/food-format";
import type { FoodGroupViewModel, FoodImageViewModel } from "@/types";

const LONG_PRESS_MILLISECONDS = 450;
const MOVEMENT_TOLERANCE = 10;
const FALLBACK_GRID_ROW_HEIGHT = 1;
const FALLBACK_CARD_GAP = 18;

interface FoodCardProps {
  group: FoodGroupViewModel;
  image: FoodImageViewModel;
  imageIndex: number;
  isExpanded: boolean;
  mutationsEnabled: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onElementChange: (imageId: string, element: HTMLElement | null) => void;
}

export function FoodCard({
  group,
  image,
  imageIndex,
  isExpanded,
  mutationsEnabled,
  onExpand,
  onCollapse,
  onElementChange,
}: FoodCardProps) {
  const articleRef = useRef<HTMLElement | null>(null);
  const expandedContentRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<number | null>(null);
  const pressTargetRef = useRef<HTMLButtonElement | null>(null);
  const pressOriginRef = useRef({ x: 0, y: 0 });
  const [isFlipped, setIsFlipped] = useState(false);
  const [collapsedRowSpan, setCollapsedRowSpan] = useState(24);
  const [expandedRowSpan, setExpandedRowSpan] = useState(64);
  const [imageUrl, setImageUrl] = useState(image.imageUrl);
  const [hasImageError, setHasImageError] = useState(!image.imageUrl);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const imageWidth = Math.max(1, image.width);
  const imageHeight = Math.max(1, image.height);
  const displayRatio = imageHeight / imageWidth;

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
      const targetHeight = isExpanded
        ? expandedContentRef.current?.getBoundingClientRect().height ?? article.scrollHeight
        : article.getBoundingClientRect().width * displayRatio;
      const nextRowSpan = Math.max(
        1,
        Math.ceil((targetHeight + cardGap + rowGap) / (rowHeight + rowGap)),
      );

      if (isExpanded) setExpandedRowSpan(nextRowSpan);
      else setCollapsedRowSpan(nextRowSpan);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(article);
    if (expandedContentRef.current) observer.observe(expandedContentRef.current);
    return () => observer.disconnect();
  }, [displayRatio, isExpanded]);

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
    pressOriginRef.current = { x: event.clientX, y: event.clientY };
    const trigger = event.currentTarget;
    pressTargetRef.current = trigger;
    trigger.classList.add("is-pressing");
    trigger.setPointerCapture(event.pointerId);
    clearPressTimer();
    pressTimerRef.current = window.setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(18);
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
    clearPressTimer();
    if (hasImageError) {
      void refreshImage();
      return;
    }
    setIsFlipped((current) => !current);
  }

  function collapseDetails() {
    onCollapse();
    window.requestAnimationFrame(() => {
      articleRef.current
        ?.querySelector<HTMLButtonElement>(".food-card-button")
        ?.focus({ preventScroll: true });
    });
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

  if (isExpanded) {
    return (
      <article
        ref={setArticleRef}
        className="food-card food-card-expanded relative col-span-full min-w-0 md:col-span-2"
        style={{ gridRowEnd: `span ${expandedRowSpan}` }}
      >
        <div ref={expandedContentRef}>
          <FoodExpandedCard
            group={group}
            initialImageIndex={imageIndex}
            mutationsEnabled={mutationsEnabled}
            onClose={collapseDetails}
          />
        </div>
      </article>
    );
  }

  return (
    <article
      ref={setArticleRef}
      className="food-card relative min-w-0"
      style={{ gridRowEnd: `span ${collapsedRowSpan}` }}
    >
      <div
        className="food-card-compact relative w-full"
        style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
      >
        <button
          type="button"
          aria-label={`${group.category}，第 ${imageIndex + 1} 张，共 ${group.images.length} 张；点击翻转，长按展开详情`}
          aria-pressed={isFlipped}
          aria-expanded="false"
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
                  width={imageWidth}
                  height={imageHeight}
                  sizes="(max-width: 359px) 100vw, (max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
                  className="h-full w-full object-contain"
                  onError={() => setHasImageError(true)}
                />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-xs text-[#6f675e]">
                  <span>图片暂时无法显示</span>
                  <span className="font-semibold text-[#4f4942]">{isRefreshing ? "正在重试…" : "点击重试"}</span>
                </span>
              )}
              <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-[#f8f4ed] px-3 py-1.5 text-[0.62rem] font-semibold tracking-[0.03em] text-[#453f38] shadow-sm">
                {group.category}
              </span>
              {group.images.length > 1 ? (
                <span className="absolute right-3 top-3 rounded-full bg-[#292d27] px-2.5 py-1 text-[0.58rem] font-semibold tabular-nums text-white shadow-sm">
                  {imageIndex + 1}/{group.images.length}
                </span>
              ) : null}
            </span>
            <span className="food-card-face food-card-back flex flex-col justify-between bg-[#30352e] p-4 text-[#f5f1e8] sm:p-5">
              <span>
                <span className="block text-[0.58rem] font-semibold uppercase tracking-[0.17em] text-[#b9c0b2]">Food memory</span>
                <span className="display-type mt-3 block text-[clamp(1.35rem,2.4vw,2rem)] leading-none">{group.category}</span>
              </span>
              <span className="block space-y-1.5 pr-10 text-[0.66rem] leading-5 text-[#dfe2d8] sm:text-xs">
                <span className="block line-clamp-2">{foodLocationLabel(group)}</span>
                <span className="block">{formatFoodDateTime(group)}</span>
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
