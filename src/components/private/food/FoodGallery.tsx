"use client";

import { useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { FoodCard } from "@/components/private/food/FoodCard";
import { FoodDetailDialog } from "@/components/private/food/FoodDetailDialog";
import type { FoodGroupViewModel } from "@/types";

interface DetailSelection {
  group: FoodGroupViewModel;
  imageIndex: number;
  trigger: HTMLElement;
}

export function FoodGallery({
  groups,
  mutationsEnabled,
}: {
  groups: FoodGroupViewModel[];
  mutationsEnabled: boolean;
}) {
  const [selection, setSelection] = useState<DetailSelection | null>(null);
  const imageCount = groups.reduce((total, group) => total + group.images.length, 0);

  function closeDetails() {
    const trigger = selection?.trigger;
    setSelection(null);
    window.requestAnimationFrame(() => trigger?.focus());
  }

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
      <div className="food-gallery grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {groups.flatMap((group) => group.images.map((image, imageIndex) => (
          <FoodCard
            key={image.id}
            group={group}
            image={image}
            imageIndex={imageIndex}
            onOpenDetails={(trigger) => setSelection({ group, imageIndex, trigger })}
          />
        )))}
      </div>
      {selection ? (
        <FoodDetailDialog
          group={selection.group}
          initialImageIndex={selection.imageIndex}
          mutationsEnabled={mutationsEnabled}
          onClose={closeDetails}
        />
      ) : null}
    </>
  );
}
