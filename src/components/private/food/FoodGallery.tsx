"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { FoodCard } from "@/components/private/food/FoodCard";
import { FoodExpandedCard } from "@/components/private/food/FoodExpandedCard";
import type { FoodGroupViewModel } from "@/types";

const INITIAL_VISIBLE_IMAGES = 12;
const IMAGES_PER_BATCH = 12;

export function FoodGallery({
  groups,
  mutationsEnabled,
}: {
  groups: FoodGroupViewModel[];
  mutationsEnabled: boolean;
}) {
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [visibleImageCount, setVisibleImageCount] = useState(INITIAL_VISIBLE_IMAGES);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const imageEntries = useMemo(
    () => groups.flatMap((group) => group.images.map((image, imageIndex) => ({ group, image, imageIndex }))),
    [groups],
  );
  const visibleEntries = imageEntries.slice(0, visibleImageCount);
  const hasMore = visibleEntries.length < imageEntries.length;
  const expandedImage = visibleEntries.find(({ image }) => image.id === expandedImageId) ?? null;

  const loadMore = useCallback(() => {
    setVisibleImageCount((current) => Math.min(current + IMAGES_PER_BATCH, imageEntries.length));
  }, [imageEntries.length]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { rootMargin: "480px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

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

  if (imageEntries.length === 0) {
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
        {visibleEntries.map(({ group, image, imageIndex }) => (
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
          <span className="food-gallery-loading text-xs text-[#81786e]">Loading more...</span>
        ) : null}
      </div>

      {expandedImage ? (
        <div className="private-media-overlay fixed inset-0 z-50 grid place-items-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="关闭美食详情"
            className="absolute inset-0 bg-[#14120f]/52 backdrop-blur-md"
            onClick={() => setExpandedImageId(null)}
          />
          <div className="private-media-panel relative z-10 w-[min(96vw,72rem)] max-h-[92svh] overflow-auto">
            <FoodExpandedCard
              group={expandedImage.group}
              initialImageIndex={expandedImage.imageIndex}
              mutationsEnabled={mutationsEnabled}
              onClose={() => setExpandedImageId(null)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
