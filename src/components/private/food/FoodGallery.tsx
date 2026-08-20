"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { FoodCard } from "@/components/private/food/FoodCard";
import { FoodExpandedCard } from "@/components/private/food/FoodExpandedCard";
import type { FoodGroupViewModel } from "@/types";

export function FoodGallery({
  groups,
  mutationsEnabled,
}: {
  groups: FoodGroupViewModel[];
  mutationsEnabled: boolean;
}) {
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const imageCount = groups.reduce((total, group) => total + group.images.length, 0);
  const expandedImage = groups
    .flatMap((group) => group.images.map((image, imageIndex) => ({ group, image, imageIndex })))
    .find(({ image }) => image.id === expandedImageId) ?? null;

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

  if (groups.length === 0 || imageCount === 0) {
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
        {groups.flatMap((group) => group.images.map((image, imageIndex) => (
          <FoodCard
            key={image.id}
            group={group}
            image={image}
            imageIndex={imageIndex}
            isExpanded={expandedImageId === image.id}
            onExpand={() => setExpandedImageId(image.id)}
            onElementChange={() => undefined}
          />
        )))}
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
