"use client";

import { SafeImage } from "@/components/common/SafeImage";
import { ProjectCoverVideo } from "@/components/public/ProjectCoverVideo";
import styles from "@/components/public/ProjectCoverGallery.module.css";
import { useState } from "react";
import type { ProjectCoverMedia, ProjectCoverMediaGroup } from "@/types";

interface ProjectCoverGalleryProps {
  title: string;
  media: ProjectCoverMediaGroup[];
  fallbackIndex: number;
}

export function ProjectCoverGallery({
  title,
  media,
  fallbackIndex,
}: ProjectCoverGalleryProps) {
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, number>>({});
  const galleryRows: Array<Array<ProjectCoverMedia | null>> = media.length > 0
    ? media
    : [[null]];
  const mediaCount = galleryRows.reduce((count, row) => count + row.length, 0);
  let mediaIndex = 0;

  const renderMedia = (
    item: ProjectCoverMedia | null,
    index: number,
    rowLength: number,
  ) => (
    item?.type === "video" ? (
      <ProjectCoverVideo title={`${title}，第 ${index + 1} 项`} video={item} />
    ) : (
      <SafeImage
        src={item?.url}
        alt={mediaCount > 1
          ? `${title}画廊，第 ${index + 1} 项`
          : `${title}封面`}
        sizes={rowLength > 1
          ? `(min-width: 768px) ${Math.ceil(50 / rowLength)}vw, ${Math.ceil(92 / rowLength)}vw`
          : "(min-width: 768px) 50vw, 92vw"}
        ratio="wide"
        fallbackIndex={fallbackIndex + index}
        preserveAspectRatio
        onAspectRatioChange={item && rowLength > 1
          ? (aspectRatio) => {
              setImageAspectRatios((current) => (
                current[item.url] === aspectRatio
                  ? current
                  : { ...current, [item.url]: aspectRatio }
              ));
            }
          : undefined}
      />
    )
  );

  return (
    <div className={styles.gallery} role="group" aria-label={`${title}作品画廊`}>
      {galleryRows.map((row, rowIndex) => {
        const indexedRow = row.map((item) => ({ item, index: mediaIndex++ }));
        const rowKey = indexedRow.map(({ item, index }) => (
          item?.type === "video" ? item.embedUrl : item?.url ?? `fallback-${index}`
        )).join("|");

        return (
          <div key={`${rowIndex}-${rowKey}`} className={styles.item}>
            {indexedRow.length > 1 ? (
              <div
                className={styles.row}
                role="group"
                aria-label={`${title}画廊，第 ${rowIndex + 1} 行`}
              >
                {indexedRow.map(({ item, index }) => {
                  const key = item?.type === "video"
                    ? item.embedUrl
                    : item?.url ?? `fallback-${index}`;
                  const aspectRatio = item?.type === "video"
                    ? 16 / 9
                    : item
                      ? imageAspectRatios[item.url] ?? 16 / 9
                      : 16 / 9;

                  return (
                    <div
                      key={key}
                      className={styles.rowItem}
                      style={{ flexGrow: aspectRatio }}
                    >
                      {renderMedia(item, index, indexedRow.length)}
                    </div>
                  );
                })}
              </div>
            ) : (
              renderMedia(indexedRow[0]?.item ?? null, indexedRow[0]?.index ?? 0, 1)
            )}
          </div>
        );
      })}
    </div>
  );
}
