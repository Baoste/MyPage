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
      <div ref={statsRef} className="scroll-mt-28">
        {statsOpen ? <FoodStatsPanel statistics={statistics} /> : null}
      </div>

      <div className="container-shell py-10 md:py-14">
        {!uploadEnabled ? (
          <p id="food-upload-unavailable" className="mb-8 border border-[#c9c0b4] bg-[#eee8de] px-4 py-3 text-xs leading-5 text-[#72695f]">
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
          className="pointer-events-auto grid size-14 place-items-center rounded-full border border-[#d1c7ba] bg-[#292d27] text-[0.62rem] font-semibold tracking-[0.08em] text-white shadow-[0_8px_28px_rgba(30,30,25,0.22)]"
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
          className="pointer-events-auto grid size-14 place-items-center rounded-full border border-[#d1c7ba] bg-[#a64b2a] text-3xl font-light leading-none text-white shadow-[0_8px_28px_rgba(30,30,25,0.22)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span aria-hidden="true" className="-translate-y-px">+</span>
        </button>
      </div>

      {uploadOpen ? <FoodUploadDialog onClose={() => setUploadOpen(false)} /> : null}
    </div>
  );
}
