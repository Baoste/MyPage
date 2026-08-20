"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { PhotoCard } from "@/components/private/photos/PhotoCard";
import { PhotoExpandedCard } from "@/components/private/photos/PhotoExpandedCard";
import type { PhotoViewModel } from "@/types";

export function PhotoGallery({
  photos,
  mutationsEnabled,
}: {
  photos: PhotoViewModel[];
  mutationsEnabled: boolean;
}) {
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);

  const expandedPhoto = photos.find((photo) => photo.id === expandedPhotoId) ?? null;

  useEffect(() => {
    if (!expandedPhotoId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedPhotoId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [expandedPhotoId]);

  if (photos.length === 0) {
    return <EmptyState title="还没有照片" message="点击右下角的加号，保存第一张日常照片。" />;
  }

  return (
    <>
      <div className="photo-gallery food-gallery grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            isExpanded={expandedPhotoId === photo.id}
            onExpand={() => setExpandedPhotoId(photo.id)}
            onElementChange={() => undefined}
          />
        ))}
      </div>

      {expandedPhoto ? (
        <div className="private-media-overlay fixed inset-0 z-50 grid place-items-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="关闭照片详情"
            className="absolute inset-0 bg-[#14120f]/52 backdrop-blur-md"
            onClick={() => setExpandedPhotoId(null)}
          />
          <div className="private-media-panel relative z-10 w-[min(96vw,72rem)] max-h-[92svh] overflow-auto">
            <PhotoExpandedCard
              photo={expandedPhoto}
              mutationsEnabled={mutationsEnabled}
              onClose={() => setExpandedPhotoId(null)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
