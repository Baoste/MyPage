"use client";

import { useId } from "react";
import {
  treePalettes,
  type TreeControls,
  type TreePaletteName,
  type TreePixelScale,
} from "@/components/private/tree/config";
import type { PhotoActivityStats } from "@/types";

interface RangeControlProps {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  disabled?: boolean;
}

function RangeControl({
  label,
  value,
  minimum,
  maximum,
  step,
  onChange,
  format = (current) => String(current),
  disabled = false,
}: RangeControlProps) {
  const id = useId();

  return (
    <div className={disabled ? "opacity-45" : undefined}>
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[0.72rem] text-[#d5d5c7]">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-[0.68rem] text-[#a8ad9f]">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="h-5 w-full cursor-pointer accent-[#aabf72] disabled:cursor-not-allowed"
      />
    </div>
  );
}

function ActivitySummary({ activity }: { activity: PhotoActivityStats }) {
  if (activity.status === "unavailable") {
    return <span>照片统计暂不可用 · 自动密度为 0%</span>;
  }
  if (activity.status === "empty") {
    return <span>暂无上传记录 · 树正在休眠</span>;
  }

  const days = activity.daysSinceLastUpload ?? 0;
  const recency = days < 1 ? "今天有记录" : `距上次 ${Math.floor(days)} 天`;
  const stage = days <= 21 ? "保持茂盛" : days < 40 ? "叶片衰减中" : "叶片已归零";
  return <span>{recency} · {stage}</span>;
}

interface TreeControlPanelProps {
  controls: TreeControls;
  activity: PhotoActivityStats;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (changes: Partial<TreeControls>) => void;
  onReset: () => void;
  onRandomize: () => void;
}

export function TreeControlPanel({
  controls,
  activity,
  isOpen,
  onToggle,
  onChange,
  onReset,
  onRandomize,
}: TreeControlPanelProps) {
  if (!isOpen) return null;

  return (
    <aside
      id="tree-control-panel"
      aria-label="像素树控制面板"
      className="absolute inset-x-3 bottom-3 z-20 max-h-[58svh] overflow-y-auto border border-white/20 bg-[#111713ed] text-[#ecebdd] shadow-[0_18px_60px_#05080766] backdrop-blur-md md:inset-x-auto md:bottom-6 md:left-6 md:max-h-[calc(100%-3rem)] md:w-[20rem]"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/12 bg-[#111713f5] px-4 py-3.5">
        <div>
          <p className="text-[0.67rem] font-semibold uppercase tracking-[0.16em] text-[#aabf72]">
            Living tree controls
          </p>
          <p className="mt-1 text-[0.68rem] leading-5 text-[#a8ad9f]">
            <ActivitySummary activity={activity} />
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded="true"
          aria-controls="tree-control-panel"
          aria-label="收起像素树控制面板"
          className="min-h-11 min-w-11 border border-white/15 text-lg text-[#d5d5c7]"
        >
          −
        </button>
      </div>

      <div className="space-y-5 px-4 py-4">
        <fieldset className="space-y-3.5">
          <legend className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#858d7d]">
            数据
          </legend>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 border-y border-white/10 py-2 text-xs text-[#d5d5c7]">
            照片活跃度自动驱动
            <input
              type="checkbox"
              checked={controls.autoActivity}
              onChange={(event) => onChange({ autoActivity: event.currentTarget.checked })}
              className="size-4 accent-[#aabf72]"
            />
          </label>
          <RangeControl
            label="手动叶片密度"
            value={controls.manualDensity}
            minimum={0}
            maximum={1}
            step={0.01}
            disabled={controls.autoActivity}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(manualDensity) => onChange({ manualDensity })}
          />
          <div className="flex items-center justify-between text-[0.68rem] text-[#a8ad9f]">
            <span>当前活力</span>
            <span className="font-mono">{Math.round(activity.vitality * 100)}%</span>
          </div>
        </fieldset>

        <fieldset className="space-y-3.5 border-t border-white/12 pt-4">
          <legend className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#858d7d]">
            树形
          </legend>
          <label className="block text-[0.72rem] text-[#d5d5c7]">
            随机种子
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={controls.seed}
                maxLength={80}
                onChange={(event) => onChange({ seed: event.currentTarget.value })}
                className="min-h-11 min-w-0 flex-1 border border-white/15 bg-black/20 px-3 font-mono text-[0.7rem] text-[#ecebdd]"
              />
              <button
                type="button"
                onClick={onRandomize}
                className="min-h-11 border border-white/15 px-3 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-[#cdd5b9]"
              >
                随机
              </button>
            </div>
          </label>
          <RangeControl
            label="分枝深度"
            value={controls.branchDepth}
            minimum={4}
            maximum={9}
            step={1}
            onChange={(branchDepth) => onChange({ branchDepth })}
          />
          <RangeControl
            label="树冠宽度"
            value={controls.canopyWidth}
            minimum={0.6}
            maximum={1.4}
            step={0.01}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(canopyWidth) => onChange({ canopyWidth })}
          />
          <RangeControl
            label="树干粗细"
            value={controls.trunkScale}
            minimum={0.6}
            maximum={1.6}
            step={0.01}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(trunkScale) => onChange({ trunkScale })}
          />
        </fieldset>

        <fieldset className="space-y-3.5 border-t border-white/12 pt-4">
          <legend className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#858d7d]">
            风
          </legend>
          <RangeControl
            label="风力"
            value={controls.windStrength}
            minimum={0}
            maximum={1}
            step={0.01}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(windStrength) => onChange({ windStrength })}
          />
          <RangeControl
            label="风速"
            value={controls.windSpeed}
            minimum={0.1}
            maximum={2}
            step={0.01}
            format={(value) => `${value.toFixed(2)}×`}
            onChange={(windSpeed) => onChange({ windSpeed })}
          />
          <RangeControl
            label="阵风强度"
            value={controls.gustStrength}
            minimum={0}
            maximum={1}
            step={0.01}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(gustStrength) => onChange({ gustStrength })}
          />
        </fieldset>

        <fieldset className="space-y-3.5 border-t border-white/12 pt-4">
          <legend className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#858d7d]">
            落叶
          </legend>
          <RangeControl
            label="脱落率"
            value={controls.fallRate}
            minimum={0}
            maximum={1}
            step={0.01}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(fallRate) => onChange({ fallRate })}
          />
          <RangeControl
            label="重力"
            value={controls.gravity}
            minimum={0.2}
            maximum={2}
            step={0.01}
            format={(value) => `${value.toFixed(2)}×`}
            onChange={(gravity) => onChange({ gravity })}
          />
          <RangeControl
            label="横向漂移"
            value={controls.drift}
            minimum={0}
            maximum={1}
            step={0.01}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(drift) => onChange({ drift })}
          />
        </fieldset>

        <fieldset className="space-y-3.5 border-t border-white/12 pt-4">
          <legend className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#858d7d]">
            画面
          </legend>
          <label className="block text-[0.72rem] text-[#d5d5c7]">
            色板
            <select
              value={controls.palette}
              onChange={(event) =>
                onChange({ palette: event.currentTarget.value as TreePaletteName })
              }
              className="mt-1.5 min-h-11 w-full border border-white/15 bg-[#151c17] px-3 text-xs text-[#ecebdd]"
            >
              {Object.entries(treePalettes).map(([value, palette]) => (
                <option key={value} value={value}>{palette.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-[0.72rem] text-[#d5d5c7]">
            像素倍率
            <select
              value={String(controls.pixelScale)}
              onChange={(event) => {
                const value = event.currentTarget.value;
                onChange({
                  pixelScale: (value === "auto" ? "auto" : Number(value)) as TreePixelScale,
                });
              }}
              className="mt-1.5 min-h-11 w-full border border-white/15 bg-[#151c17] px-3 text-xs text-[#ecebdd]"
            >
              <option value="auto">自动</option>
              <option value="2">2×</option>
              <option value="3">3×</option>
              <option value="4">4×</option>
            </select>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 border-y border-white/10 py-2 text-xs text-[#d5d5c7]">
            播放动画
            <input
              type="checkbox"
              checked={!controls.isPaused}
              onChange={(event) => onChange({ isPaused: !event.currentTarget.checked })}
              className="size-4 accent-[#aabf72]"
            />
          </label>
        </fieldset>

        <button
          type="button"
          onClick={onReset}
          className="min-h-11 w-full border border-white/20 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#d5d5c7]"
        >
          恢复默认值
        </button>
      </div>
    </aside>
  );
}
