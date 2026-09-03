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

  return (
    <div className={styles.gallery} role="group" aria-label={`${title}作品画廊`}>
      {galleryMedia.map((item, index) => {
        const key = item?.type === "video"
          ? item.embedUrl
          : item?.url ?? "fallback";

        return (
          <div key={key} className={styles.item}>
            {item?.type === "video" ? (
              <ProjectCoverVideo title={`${title}，第 ${index + 1} 项`} video={item} />
            ) : (
              <SafeImage
                src={item?.url}
                alt={galleryMedia.length > 1
                  ? `${title}画廊，第 ${index + 1} 项`
                  : `${title}封面`}
                sizes="(min-width: 768px) 50vw, 92vw"
                ratio="wide"
                fallbackIndex={fallbackIndex + index}
                preserveAspectRatio
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
