"use client";

import { useRef, useState } from "react";
import { PhotoGallery } from "@/components/private/photos/PhotoGallery";
import { PhotoStatsPanel } from "@/components/private/photos/PhotoStatsPanel";
import { PhotoUploadDialog } from "@/components/private/photos/PhotoUploadDialog";
import type { PhotoStatistics, PhotoViewModel } from "@/types";

export function PhotoExperience({
  photos,
  statistics,
  uploadEnabled,
  mutationsEnabled,
  uploadDisabledReason,
}: {
  photos: PhotoViewModel[];
  statistics: PhotoStatistics;
  uploadEnabled: boolean;
  mutationsEnabled: boolean;
  uploadDisabledReason?: string;
}) {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  function toggleStatistics() {
    const next = !statsOpen;
    setStatsOpen(next);
    if (next) {
      window.requestAnimationFrame(() => {
        statsRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      });
    }
  }

  return (
    <div className="pb-28">
      <div
        ref={statsRef}
        aria-hidden={!statsOpen}
        className={`food-stats-region scroll-mt-28 ${statsOpen ? "is-open" : ""}`}
      >
        <div className="food-stats-clip">
          <div className="food-stats-content container-shell pt-6 md:pt-8">
            <PhotoStatsPanel statistics={statistics} />
          </div>
        </div>
      </div>

      <div className="container-shell py-8 md:py-12">
        {!uploadEnabled ? (
          <p id="photo-upload-unavailable" className="mb-8 rounded-2xl border border-[#d5cdc1] bg-[#eee8de] px-4 py-3.5 text-xs leading-5 text-[#72695f]">
            {uploadDisabledReason ?? "当前暂时不能上传照片。"}
          </p>
        ) : null}
        <PhotoGallery photos={photos} mutationsEnabled={mutationsEnabled} />
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex items-end justify-between px-4 sm:px-6">
        <button type="button" aria-expanded={statsOpen} aria-controls="photo-statistics-region" onClick={toggleStatistics} className="private-fab pointer-events-auto grid size-14 place-items-center rounded-full bg-[#30342e] text-[0.62rem] font-semibold tracking-[0.08em] text-white shadow-[0_10px_30px_rgba(30,30,25,0.2)]">
          {statsOpen ? "收起" : "统计"}
        </button>
        <button type="button" disabled={!uploadEnabled} aria-describedby={!uploadEnabled ? "photo-upload-unavailable" : undefined} onClick={() => setUploadOpen(true)} aria-label="新增照片" title={uploadEnabled ? "新增照片" : uploadDisabledReason ?? "暂时无法上传"} className="private-fab pointer-events-auto grid size-14 place-items-center rounded-full bg-[#a64b2a] text-3xl font-light leading-none text-white shadow-[0_10px_30px_rgba(88,44,27,0.24)] disabled:cursor-not-allowed disabled:opacity-45">
          <span aria-hidden="true" className="-translate-y-px">+</span>
        </button>
      </div>

      {uploadOpen ? <PhotoUploadDialog onClose={() => setUploadOpen(false)} /> : null}
    </div>
  );
}
