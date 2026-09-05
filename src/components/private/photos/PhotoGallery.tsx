"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { PhotoCard } from "@/components/private/photos/PhotoCard";
import { PhotoExpandedCard } from "@/components/private/photos/PhotoExpandedCard";
import type { PhotoPage, PhotoViewModel } from "@/types";

type PhotosApiResponse = ({ ok: true } & PhotoPage) | {
  ok: false;
  message?: string;
};

export function PhotoGallery({
  photos,
  nextCursor,
  mutationsEnabled,
}: {
  photos: PhotoViewModel[];
  nextCursor: string | null;
  mutationsEnabled: boolean;
}) {
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [loadedPhotos, setLoadedPhotos] = useState(photos);
  const [cursor, setCursor] = useState(nextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const imageEntries = useMemo(
    () => loadedPhotos.flatMap((photo) => photo.images.map((image, imageIndex) => ({ photo, image, imageIndex }))),
    [loadedPhotos],
  );
  const hasMore = cursor !== null;
  const expandedImage = imageEntries.find(({ image }) => image.id === expandedImageId) ?? null;
  const expandedPhotoIndex = expandedImage
    ? loadedPhotos.findIndex((photo) => photo.id === expandedImage.photo.id)
    : -1;
  const hasPreviousPhoto = expandedPhotoIndex > 0;
  const hasNextPhoto = expandedPhotoIndex >= 0 && (
    expandedPhotoIndex < loadedPhotos.length - 1
    || (expandedPhotoIndex === loadedPhotos.length - 1 && hasMore && !isLoading)
  );

  const loadMore = useCallback(async (): Promise<PhotoViewModel[]> => {
    if (!cursor || loadingRef.current) return [];

    loadingRef.current = true;
    setIsLoading(true);
    setLoadError(null);
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const response = await fetch(
        `/api/private/photos/entries?cursor=${encodeURIComponent(cursor)}`,
        { cache: "no-store", signal: controller.signal },
      );
      const data = await response.json() as PhotosApiResponse;
      if (!response.ok || data.ok !== true) {
        throw new Error(data.ok === false && data.message
          ? data.message
          : "Unable to load more photos.");
      }
      if (!Array.isArray(data.photos) || (data.nextCursor !== null && typeof data.nextCursor !== "string")) {
        throw new Error("The gallery returned an invalid page.");
      }

      setLoadedPhotos((current) => {
        const existingIds = new Set(current.map((photo) => photo.id));
        return [
          ...current,
          ...data.photos.filter((photo) => !existingIds.has(photo.id)),
        ];
      });
      setCursor(data.nextCursor);
      return data.photos;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return [];
      setLoadError(error instanceof Error ? error.message : "Unable to load more photos.");
      return [];
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [cursor]);

  async function moveExpandedPhoto(amount: number) {
    const target = loadedPhotos[expandedPhotoIndex + amount];
    if (target?.images[0]) {
      setExpandedImageId(target.images[0].id);
      return;
    }
    if (amount < 1 || !cursor) return;
    const existingIds = new Set(loadedPhotos.map((photo) => photo.id));
    const nextPhoto = (await loadMore()).find((photo) => !existingIds.has(photo.id));
    if (nextPhoto?.images[0]) setExpandedImageId(nextPhoto.images[0].id);
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

  if (loadedPhotos.length === 0 && !hasMore) {
    return <EmptyState title="还没有照片" message="点击右下角的加号，保存第一张日常照片。" />;
  }

  return (
    <>
      <div className="photo-gallery food-gallery grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {imageEntries.map(({ photo, image, imageIndex }) => (
          <PhotoCard
            key={image.id}
            photo={photo}
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
            aria-label={loadError ? "Retry loading photos" : "Load more photos"}
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
            ? "Unable to load more photos. Activate the button to retry."
            : isLoading
              ? "Loading more photos."
              : ""}
        </span>
      </div>

      {expandedImage ? (
        <div className="private-media-overlay fixed inset-0 z-50 grid place-items-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="关闭照片详情"
            className="absolute inset-0 bg-[#14120f]/52 backdrop-blur-md"
            onClick={() => setExpandedImageId(null)}
          />
          <div className="private-media-stage">
            <button type="button" disabled={!hasPreviousPhoto} onClick={() => void moveExpandedPhoto(-1)} aria-label="上一组照片" className="private-media-nav private-media-nav-previous"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12.5 6.5-5.5 5.5 5.5 5.5" /><path d="m18 6.5-5.5 5.5 5.5 5.5" /></svg></button>
            <div className="private-media-panel max-h-[92svh] w-full overflow-auto">
              <PhotoExpandedCard
                key={expandedImage.photo.id}
                photo={expandedImage.photo}
                initialImageIndex={expandedImage.imageIndex}
                mutationsEnabled={mutationsEnabled}
                onClose={() => setExpandedImageId(null)}
              />
            </div>
            <button type="button" disabled={!hasNextPhoto} onClick={() => void moveExpandedPhoto(1)} aria-label="下一组照片" className="private-media-nav private-media-nav-next"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11.5 6.5 5.5 5.5-5.5 5.5" /><path d="m6 6.5 5.5 5.5-5.5 5.5" /></svg></button>
          </div>
        </div>
      ) : null}
    </>
  );
}
