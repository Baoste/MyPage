import { SafeImage } from "@/components/common/SafeImage";
import { ProjectCoverVideo } from "@/components/public/ProjectCoverVideo";
import styles from "@/components/public/ProjectCoverGallery.module.css";
import type { ProjectCoverMedia } from "@/types";

interface ProjectCoverGalleryProps {
  title: string;
  media: ProjectCoverMedia[];
  fallbackIndex: number;
}

export function ProjectCoverGallery({
  title,
  media,
  fallbackIndex,
}: ProjectCoverGalleryProps) {
  const galleryMedia: Array<ProjectCoverMedia | null> = media.length > 0 ? media : [null];
  const hasWideLead = galleryMedia.length > 1 && galleryMedia.length % 2 === 1;

  return (
    <div className={styles.gallery} role="group" aria-label={`${title}作品画廊`}>
      {galleryMedia.map((item, index) => {
        const key = item?.type === "video"
          ? item.embedUrl
          : item?.url ?? "fallback";
        const isWideItem = index === 0 && hasWideLead;
        const sizes = isWideItem || galleryMedia.length === 1
          ? "(min-width: 768px) 50vw, 92vw"
          : "(min-width: 768px) 25vw, 92vw";

        return (
          <div
            key={key}
            className={`${styles.item} ${isWideItem ? styles.wideItem : ""}`}
          >
            {item?.type === "video" ? (
              <ProjectCoverVideo title={`${title}，第 ${index + 1} 项`} video={item} />
            ) : (
              <SafeImage
                src={item?.url}
                alt={galleryMedia.length > 1
                  ? `${title}封面，第 ${index + 1} 张`
                  : `${title}封面`}
                sizes={sizes}
                ratio="wide"
                fallbackIndex={fallbackIndex + index}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
