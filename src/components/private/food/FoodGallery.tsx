"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { FoodCard } from "@/components/private/food/FoodCard";
import { animatePrivateLayout } from "@/lib/motion";
import type { FoodGroupViewModel } from "@/types";

export function FoodGallery({
  groups,
  mutationsEnabled,
}: {
  groups: FoodGroupViewModel[];
  mutationsEnabled: boolean;
}) {
  const cardElementsRef = useRef(new Map<string, HTMLElement>());
  const layoutAnimationsRef = useRef(new Map<HTMLElement, Animation>());
  const expandedImageIdRef = useRef<string | null>(null);
  const transitionVersionRef = useRef(0);
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const imageCount = groups.reduce((total, group) => total + group.images.length, 0);

  const registerCardElement = useCallback((imageId: string, element: HTMLElement | null) => {
    if (element) cardElementsRef.current.set(imageId, element);
    else cardElementsRef.current.delete(imageId);
  }, []);

  const animateLayoutTo = useCallback((nextImageId: string | null) => {
    return animatePrivateLayout(
      cardElementsRef.current,
      layoutAnimationsRef.current,
      () => {
        expandedImageIdRef.current = nextImageId;
        flushSync(() => setExpandedImageId(nextImageId));
      },
    );
  }, []);

  const changeExpandedCard = useCallback((nextImageId: string | null) => {
    if (nextImageId === expandedImageIdRef.current) return;

    const transitionVersion = transitionVersionRef.current + 1;
    transitionVersionRef.current = transitionVersion;
    const currentImageId = expandedImageIdRef.current;

    if (currentImageId && nextImageId) {
      void animateLayoutTo(null).then(() => {
        if (transitionVersionRef.current !== transitionVersion) return;
        return animateLayoutTo(nextImageId);
      });
      return;
    }

    void animateLayoutTo(nextImageId);
  }, [animateLayoutTo]);

  useEffect(() => () => {
    transitionVersionRef.current += 1;
    for (const [element, animation] of layoutAnimationsRef.current) {
      animation.cancel();
      element.style.willChange = "";
    }
    layoutAnimationsRef.current.clear();
  }, []);

  if (groups.length === 0 || imageCount === 0) {
    return (
      <EmptyState
        title="还没有美食记录"
        message="点击右下角的加号，把第一组照片和那天的味道留在这里。"
      />
    );
  }

  return (
    <div className="food-gallery grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {groups.flatMap((group) => group.images.map((image, imageIndex) => (
        <FoodCard
          key={image.id}
          group={group}
          image={image}
          imageIndex={imageIndex}
          isExpanded={expandedImageId === image.id}
          mutationsEnabled={mutationsEnabled}
          onExpand={() => changeExpandedCard(image.id)}
          onCollapse={() => changeExpandedCard(null)}
          onElementChange={registerCardElement}
        />
      )))}
    </div>
  );
}
