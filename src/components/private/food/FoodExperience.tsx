"use client";

import { useRef, useState } from "react";
import { FoodGallery } from "@/components/private/food/FoodGallery";
import { FoodStatsPanel } from "@/components/private/food/FoodStatsPanel";
import { FoodUploadDialog } from "@/components/private/food/FoodUploadDialog";
import type { FoodGroupViewModel, FoodStatistics } from "@/types";

interface FoodExperienceProps {
  groups: FoodGroupViewModel[];
  statistics: FoodStatistics;
  uploadEnabled: boolean;
  mutationsEnabled: boolean;
  uploadDisabledReason?: string;
}

export function FoodExperience({
  groups,
  statistics,
  uploadEnabled,
  mutationsEnabled,
  uploadDisabledReason,
}: FoodExperienceProps) {
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
      <div ref={statsRef} className={`scroll-mt-28 ${statsOpen ? "container-shell pt-6 md:pt-8" : ""}`}>
        {statsOpen ? <FoodStatsPanel statistics={statistics} /> : null}
      </div>

      <div className="container-shell py-8 md:py-12">
        {!uploadEnabled ? (
          <p id="food-upload-unavailable" className="mb-8 rounded-2xl border border-[#d5cdc1] bg-[#eee8de] px-4 py-3.5 text-xs leading-5 text-[#72695f]">
            {uploadDisabledReason ?? "当前暂时不能上传美食记录。"}
          </p>
        ) : null}
        <FoodGallery groups={groups} mutationsEnabled={mutationsEnabled} />
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex items-end justify-between px-4 sm:px-6">
        <button
          type="button"
          aria-expanded={statsOpen}
          aria-controls="food-statistics-region"
          onClick={toggleStatistics}
          className="pointer-events-auto grid size-14 place-items-center rounded-full bg-[#30342e] text-[0.62rem] font-semibold tracking-[0.08em] text-white shadow-[0_10px_30px_rgba(30,30,25,0.2)] transition-transform hover:-translate-y-0.5"
        >
          {statsOpen ? "收起" : "统计"}
        </button>
        <button
          type="button"
          disabled={!uploadEnabled}
          aria-describedby={!uploadEnabled ? "food-upload-unavailable" : undefined}
          onClick={() => setUploadOpen(true)}
          aria-label="新增美食记录"
          title={uploadEnabled ? "新增美食记录" : uploadDisabledReason ?? "暂时无法上传"}
          className="pointer-events-auto grid size-14 place-items-center rounded-full bg-[#a64b2a] text-3xl font-light leading-none text-white shadow-[0_10px_30px_rgba(88,44,27,0.24)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span aria-hidden="true" className="-translate-y-px">+</span>
        </button>
      </div>

      {uploadOpen ? <FoodUploadDialog onClose={() => setUploadOpen(false)} /> : null}
    </div>
  );
}
