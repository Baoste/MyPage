"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { PhotoCard } from "@/components/private/photos/PhotoCard";
import { animatePrivateLayout } from "@/lib/motion";
import type { PhotoViewModel } from "@/types";

export function PhotoGallery({
  photos,
  mutationsEnabled,
}: {
  photos: PhotoViewModel[];
  mutationsEnabled: boolean;
}) {
  const cardElementsRef = useRef(new Map<string, HTMLElement>());
  const layoutAnimationsRef = useRef(new Map<HTMLElement, Animation>());
  const expandedPhotoIdRef = useRef<string | null>(null);
  const transitionVersionRef = useRef(0);
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);

  const registerCardElement = useCallback((photoId: string, element: HTMLElement | null) => {
    if (element) cardElementsRef.current.set(photoId, element);
    else cardElementsRef.current.delete(photoId);
  }, []);

  const animateLayoutTo = useCallback((nextPhotoId: string | null) => {
    return animatePrivateLayout(
      cardElementsRef.current,
      layoutAnimationsRef.current,
      () => {
        expandedPhotoIdRef.current = nextPhotoId;
        flushSync(() => setExpandedPhotoId(nextPhotoId));
      },
    );
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
    for (const [element, animation] of layoutAnimationsRef.current) {
      animation.cancel();
      element.style.willChange = "";
    }
    layoutAnimationsRef.current.clear();
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
