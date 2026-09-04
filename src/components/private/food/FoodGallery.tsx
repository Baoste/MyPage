"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { FoodCard } from "@/components/private/food/FoodCard";
import { FoodExpandedCard } from "@/components/private/food/FoodExpandedCard";
import type { FoodGroupPage, FoodGroupViewModel } from "@/types";

type FoodGroupsApiResponse = ({ ok: true } & FoodGroupPage) | {
  ok: false;
  message?: string;
};

export function FoodGallery({
  groups,
  nextCursor,
  mutationsEnabled,
}: {
  groups: FoodGroupViewModel[];
  nextCursor: string | null;
  mutationsEnabled: boolean;
}) {
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [loadedGroups, setLoadedGroups] = useState(groups);
  const [cursor, setCursor] = useState(nextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const imageEntries = useMemo(
    () => loadedGroups.flatMap((group) => group.images.map((image, imageIndex) => ({ group, image, imageIndex }))),
    [loadedGroups],
  );
  const hasMore = cursor !== null;
  const expandedImage = imageEntries.find(({ image }) => image.id === expandedImageId) ?? null;
  const expandedGroupIndex = expandedImage
    ? loadedGroups.findIndex((group) => group.id === expandedImage.group.id)
    : -1;
  const hasPreviousGroup = expandedGroupIndex > 0;
  const hasNextGroup = expandedGroupIndex >= 0 && (
    expandedGroupIndex < loadedGroups.length - 1
    || (expandedGroupIndex === loadedGroups.length - 1 && hasMore && !isLoading)
  );

  const loadMore = useCallback(async (): Promise<FoodGroupViewModel[]> => {
    if (!cursor || loadingRef.current) return [];

    loadingRef.current = true;
    setIsLoading(true);
    setLoadError(null);
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const response = await fetch(
        `/api/private/food/groups?cursor=${encodeURIComponent(cursor)}`,
        { cache: "no-store", signal: controller.signal },
      );
      const data = await response.json() as FoodGroupsApiResponse;
      if (!response.ok || data.ok !== true) {
        throw new Error(data.ok === false && data.message
          ? data.message
          : "Unable to load more images.");
      }
      if (!Array.isArray(data.groups) || (data.nextCursor !== null && typeof data.nextCursor !== "string")) {
        throw new Error("The gallery returned an invalid page.");
      }

      setLoadedGroups((current) => {
        const existingIds = new Set(current.map((group) => group.id));
        return [
          ...current,
          ...data.groups.filter((group) => !existingIds.has(group.id)),
        ];
      });
      setCursor(data.nextCursor);
      return data.groups;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return [];
      setLoadError(error instanceof Error ? error.message : "Unable to load more images.");
      return [];
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [cursor]);

  async function moveExpandedGroup(amount: number) {
    const target = loadedGroups[expandedGroupIndex + amount];
    if (target?.images[0]) {
      setExpandedImageId(target.images[0].id);
      return;
    }
    if (amount < 1 || !cursor) return;
    const existingIds = new Set(loadedGroups.map((group) => group.id));
    const nextGroup = (await loadMore()).find((group) => !existingIds.has(group.id));
    if (nextGroup?.images[0]) setExpandedImageId(nextGroup.images[0].id);
  }

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore || isLoading || loadError) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      void loadMore();
    }, { rootMargin: "480px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadError, loadMore]);

  useEffect(() => () => requestControllerRef.current?.abort(), []);

  useEffect(() => {
    if (!expandedImageId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedImageId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [expandedImageId]);

  if (imageEntries.length === 0 && !hasMore) {
    return (
      <EmptyState
        title="还没有美食记录"
        message="点击右下角的加号，把第一组照片和那天的味道留在这里。"
      />
    );
  }

  return (
    <>
      <div className="food-gallery grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {imageEntries.map(({ group, image, imageIndex }) => (
          <FoodCard
            key={image.id}
            group={group}
            image={image}
            imageIndex={imageIndex}
            isExpanded={expandedImageId === image.id}
            onExpand={() => setExpandedImageId(image.id)}
            onElementChange={() => undefined}
          />
        ))}
      </div>

      <div ref={loadMoreRef} className="flex min-h-16 items-center justify-center pt-8" aria-live="polite">
        {hasMore ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            aria-label={loadError ? "Retry loading images" : "Load more images"}
            title={loadError ? "Retry" : "Load more"}
            className={`group grid size-11 cursor-pointer place-items-center rounded-full border bg-[#f1ece4] text-[#a64b2a] shadow-[0_5px_16px_rgba(66,54,43,0.08)] transition-[transform,border-color,box-shadow] duration-[90ms] ease-out hover:scale-105 hover:border-[#a64b2a] hover:shadow-[0_7px_20px_rgba(88,44,27,0.13)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a64b2a] motion-reduce:transform-none motion-reduce:transition-none ${loadError ? "border-[#a64b2a]" : "border-[#c9c0b4]"}`}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={`size-5 motion-reduce:animate-none ${loadError ? "" : "animate-[spin_900ms_linear_infinite]"}`}
            >
              <circle
                cx="12"
                cy="12"
                r="8.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.22"
              />
              <path
                d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
        <span className="sr-only">
          {loadError
            ? "Unable to load more images. Activate the button to retry."
            : isLoading
              ? "Loading more images."
              : ""}
        </span>
      </div>

      {expandedImage ? (
        <div className="private-media-overlay fixed inset-0 z-50 grid place-items-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="关闭美食详情"
            className="absolute inset-0 bg-[#14120f]/52 backdrop-blur-md"
            onClick={() => setExpandedImageId(null)}
          />
          <div className="private-media-stage">
            <button type="button" disabled={!hasPreviousGroup} onClick={() => void moveExpandedGroup(-1)} aria-label="上一组美食记录" className="private-media-nav private-media-nav-previous"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg></button>
            <div className="private-media-panel max-h-[92svh] w-full overflow-auto">
              <FoodExpandedCard
                key={expandedImage.group.id}
                group={expandedImage.group}
                initialImageIndex={expandedImage.imageIndex}
                mutationsEnabled={mutationsEnabled}
                onClose={() => setExpandedImageId(null)}
              />
            </div>
            <button type="button" disabled={!hasNextGroup} onClick={() => void moveExpandedGroup(1)} aria-label="下一组美食记录" className="private-media-nav private-media-nav-next"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>
          </div>
        </div>
      ) : null}
    </>
  );
}
