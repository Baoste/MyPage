"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { PhotoCard } from "@/components/private/photos/PhotoCard";
import type { PhotoViewModel } from "@/types";

const LAYOUT_ANIMATION_MILLISECONDS = 480;

export function PhotoGallery({
  photos,
  mutationsEnabled,
}: {
  photos: PhotoViewModel[];
  mutationsEnabled: boolean;
}) {
  const cardElementsRef = useRef(new Map<string, HTMLElement>());
  const expandedPhotoIdRef = useRef<string | null>(null);
  const transitionVersionRef = useRef(0);
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);

  const registerCardElement = useCallback((photoId: string, element: HTMLElement | null) => {
    if (element) cardElementsRef.current.set(photoId, element);
    else cardElementsRef.current.delete(photoId);
  }, []);

  const animateLayoutTo = useCallback((nextPhotoId: string | null) => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const before = new Map<string, DOMRect>();
    if (!reduceMotion) {
      for (const [photoId, element] of cardElementsRef.current) {
        element.getAnimations().forEach((animation) => animation.cancel());
        before.set(photoId, element.getBoundingClientRect());
      }
    }

    expandedPhotoIdRef.current = nextPhotoId;
    flushSync(() => setExpandedPhotoId(nextPhotoId));
    if (reduceMotion) return Promise.resolve();

    return new Promise<void>((resolve) => window.requestAnimationFrame(() => {
      const animations: Animation[] = [];
      for (const [photoId, element] of cardElementsRef.current) {
        const first = before.get(photoId);
        if (!first) continue;
        const last = element.getBoundingClientRect();
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;
        const scaleX = first.width / Math.max(1, last.width);
        const scaleY = first.height / Math.max(1, last.height);
        if (
          Math.abs(deltaX) < 1
          && Math.abs(deltaY) < 1
          && Math.abs(scaleX - 1) < 0.01
          && Math.abs(scaleY - 1) < 0.01
        ) continue;
        animations.push(element.animate(
          [
            {
              transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
              transformOrigin: "top left",
            },
            { transform: "translate(0, 0) scale(1, 1)", transformOrigin: "top left" },
          ],
          {
            duration: LAYOUT_ANIMATION_MILLISECONDS,
            easing: "cubic-bezier(0.22, 0.74, 0.2, 1)",
          },
        ));
      }
      if (animations.length === 0) return resolve();
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => resolve());
    }));
  }, []);

  const changeExpandedPhoto = useCallback((nextPhotoId: string | null) => {
    if (nextPhotoId === expandedPhotoIdRef.current) return;
    const transitionVersion = transitionVersionRef.current + 1;
    transitionVersionRef.current = transitionVersion;
    const currentPhotoId = expandedPhotoIdRef.current;
    if (currentPhotoId && nextPhotoId) {
      void animateLayoutTo(null).then(() => {
        if (transitionVersionRef.current !== transitionVersion) return;
        return animateLayoutTo(nextPhotoId);
      });
      return;
    }
    void animateLayoutTo(nextPhotoId);
  }, [animateLayoutTo]);

  useEffect(() => () => {
    transitionVersionRef.current += 1;
    for (const element of cardElementsRef.current.values()) {
      element.getAnimations().forEach((animation) => animation.cancel());
    }
  }, []);

  if (photos.length === 0) {
    return <EmptyState title="还没有照片" message="点击右下角的加号，保存第一张日常照片。" />;
  }

  return (
    <div className="photo-gallery food-gallery grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          isExpanded={expandedPhotoId === photo.id}
          mutationsEnabled={mutationsEnabled}
          onExpand={() => changeExpandedPhoto(photo.id)}
          onCollapse={() => changeExpandedPhoto(null)}
          onElementChange={registerCardElement}
        />
      ))}
    </div>
  );
}

