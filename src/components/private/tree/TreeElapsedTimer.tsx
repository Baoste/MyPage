"use client";

import { useEffect, useState } from "react";
import {
  calculateTreeElapsedTime,
  type TreeElapsedTime,
} from "@/components/private/tree/elapsed";

const SECOND_MILLISECONDS = 1_000;

function RollingUnit({
  value,
  label,
  minimumDigits,
}: {
  value: number;
  label: "day" | "h" | "m" | "s";
  minimumDigits: number;
}) {
  const displayValue = String(value).padStart(minimumDigits, "0");

  return (
    <span className="flex flex-col items-center gap-1">
      <span
        aria-hidden="true"
        className={`block h-[1.05em] overflow-hidden font-mono text-[clamp(1.05rem,2.2vw,1.55rem)] leading-none tabular-nums tracking-[0.08em] ${label === "day" ? "min-w-[5.2ch]" : "min-w-[2.7ch]"}`}
      >
        <span key={displayValue} className="tree-time-roll block">
          {displayValue}
        </span>
      </span>
      <span aria-hidden="true" className="text-[0.54rem] uppercase tracking-[0.2em] text-[#9ead91]">
        {label}
      </span>
    </span>
  );
}

export function TreeElapsedTimer() {
  const [elapsed, setElapsed] = useState<TreeElapsedTime | null>(null);

  useEffect(() => {
    let interval: number | null = null;
    const update = () => setElapsed(calculateTreeElapsedTime(Date.now()));
    update();

    const timeout = window.setTimeout(() => {
      update();
      interval = window.setInterval(update, SECOND_MILLISECONDS);
    }, SECOND_MILLISECONDS - (Date.now() % SECOND_MILLISECONDS));

    return () => {
      window.clearTimeout(timeout);
      if (interval !== null) window.clearInterval(interval);
    };
  }, []);

  const value = elapsed ?? { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const label = `${value.days}天 ${value.hours}小时 ${value.minutes}分 ${value.seconds}秒`;

  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 select-none text-[#efeee1]">
      <time
        aria-label={`从2020年9月26日00点至今已经过${label}`}
        dateTime={`P${value.days}DT${value.hours}H${value.minutes}M${value.seconds}S`}
        className="flex items-start gap-2 border border-white/12 bg-[#0c120e]/72 px-4 py-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.2)] backdrop-blur-[2px] sm:gap-3 sm:px-5"
      >
        <RollingUnit value={value.days} label="day" minimumDigits={4} />
        <RollingUnit value={value.hours} label="h" minimumDigits={2} />
        <RollingUnit value={value.minutes} label="m" minimumDigits={2} />
        <RollingUnit value={value.seconds} label="s" minimumDigits={2} />
      </time>
    </div>
  );
}
