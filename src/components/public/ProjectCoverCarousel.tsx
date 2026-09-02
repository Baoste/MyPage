"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/common/SafeImage";
import styles from "@/components/public/ProjectCoverCarousel.module.css";

interface ProjectCoverCarouselProps {
  title: string;
  urls: string[];
  fallbackIndex: number;
}

export function ProjectCoverCarousel({
  title,
  urls,
  fallbackIndex,
}: ProjectCoverCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const nextIndex = Math.min(Math.max(index, 0), urls.length - 1);
    track.scrollTo({ left: nextIndex * track.clientWidth });
    setActiveIndex(nextIndex);
  }, [urls.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const resizeObserver = new ResizeObserver(() => {
      track.scrollTo({
        left: activeIndexRef.current * track.clientWidth,
        behavior: "auto",
      });
    });
    resizeObserver.observe(track);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <section
      className={styles.carousel}
      aria-label={`${title}封面画廊`}
      aria-roledescription="轮播图"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goTo(activeIndex - 1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          goTo(activeIndex + 1);
        }
      }}
    >
      <div
        ref={trackRef}
        className={styles.track}
        tabIndex={0}
        onScroll={(event) => {
          const track = event.currentTarget;
          if (track.clientWidth === 0) return;
          const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
          setActiveIndex(Math.min(Math.max(nextIndex, 0), urls.length - 1));
        }}
      >
        {urls.map((url, index) => (
          <div
            key={url}
            className={styles.slide}
            role="group"
            aria-label={`第 ${index + 1} 张，共 ${urls.length} 张`}
            aria-roledescription="幻灯片"
          >
            <SafeImage
              src={url}
              alt={`${title}封面，第 ${index + 1} 张`}
              sizes="(min-width: 1200px) 50vw, (min-width: 768px) 45vw, 80vw"
              ratio="wide"
              fallbackIndex={fallbackIndex + index}
            />
          </div>
        ))}
      </div>

      <div className={styles.dots} aria-label="选择封面图片">
        {urls.map((url, index) => (
          <button
            key={url}
            type="button"
            className={styles.dot}
            aria-label={`显示第 ${index + 1} 张封面`}
            aria-current={index === activeIndex ? "true" : undefined}
            onClick={() => goTo(index)}
          />
        ))}
      </div>

      <p className={styles.status} aria-live="polite">
        第 {activeIndex + 1} 张，共 {urls.length} 张
      </p>
    </section>
  );
}
