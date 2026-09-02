import styles from "@/components/public/ProjectCoverVideo.module.css";
import type { ProjectVideoCover } from "@/types";

interface ProjectCoverVideoProps {
  title: string;
  video: ProjectVideoCover;
}

export function ProjectCoverVideo({ title, video }: ProjectCoverVideoProps) {
  return (
    <div className={styles.video}>
      <iframe
        className={styles.frame}
        src={video.embedUrl}
        title={`${title} 的 B站视频`}
        loading="lazy"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <a
        className={styles.externalLink}
        href={video.sourceUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`在 B站打开 ${title}`}
      >
        BILIBILI <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
