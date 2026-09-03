"use client";

import Image from "next/image";
import { useState } from "react";

interface SafeImageProps {
  src?: string;
  alt: string;
  sizes: string;
  ratio?: "landscape" | "portrait" | "square" | "wide";
  preload?: boolean;
  className?: string;
  fallbackIndex?: number;
  preserveAspectRatio?: boolean;
  onAspectRatioChange?: (aspectRatio: number) => void;
}

const ratios = {
  landscape: "aspect-[4/3]",
  portrait: "aspect-[4/5]",
  square: "aspect-square",
  wide: "aspect-[16/9]",
};

export function SafeImage({
  src,
  alt,
  sizes,
  ratio = "landscape",
  preload = false,
  className = "",
  fallbackIndex = 0,
  preserveAspectRatio = false,
  onAspectRatioChange,
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<string>();
  const frameClass = `relative overflow-hidden bg-[#ddd7ca] ${ratios[ratio]} ${className}`;

  if (!src || hasError) {
    const variant = Math.abs(fallbackIndex) % 3;

    return (
      <div className={frameClass} role="img" aria-label={`${alt} — 图片暂不可用`}>
        <ProjectFallback variant={variant} />
      </div>
    );
  }

  return (
    <div
      className={frameClass}
      style={naturalAspectRatio ? { aspectRatio: naturalAspectRatio } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        preload={preload}
        className={preserveAspectRatio
          ? "object-contain"
          : "object-cover transition-transform duration-500 group-hover:scale-[1.025]"}
        onLoad={(event) => {
          if (!preserveAspectRatio) return;
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth > 0 && naturalHeight > 0) {
            const aspectRatio = naturalWidth / naturalHeight;
            setNaturalAspectRatio(`${naturalWidth} / ${naturalHeight}`);
            onAspectRatioChange?.(aspectRatio);
          }
        }}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function ProjectFallback({ variant }: { variant: number }) {
  if (variant === 1) {
    return (
      <div aria-hidden="true" className="absolute inset-0 bg-[#071929] p-[7%]">
        <div className="grid h-full grid-cols-[0.7fr_1.3fr] gap-[4%] rounded-[0.35rem] border border-[#36526b] bg-[#0b2438] p-[4%]">
          <div className="grid grid-rows-[auto_1fr] gap-[8%]">
            <span className="size-[28%] rounded-full bg-[#f0201b]" />
            <div className="grid content-end gap-[7%]">
              <span className="h-2 w-[80%] bg-white/80" />
              <span className="h-2 w-[55%] bg-[#ffd400]" />
            </div>
          </div>
          <div className="grid grid-cols-3 content-center gap-[5%]">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <span key={item} className="aspect-[2/3] rounded-[0.2rem] border border-[#ffd400] bg-[#102f48]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 2) {
    return (
      <div aria-hidden="true" className="absolute inset-0 grid place-items-center bg-[#f2f3f5] p-[8%]">
        <div className="grid h-[74%] w-[88%] grid-cols-[0.8fr_1.2fr] overflow-hidden border-2 border-black bg-white">
          <div className="grid place-items-center border-r-2 border-black bg-[#ffd400]">
            <span className="size-[42%] rounded-full border-[3px] border-black bg-[#f0201b]" />
          </div>
          <div className="grid content-center gap-[10%] p-[12%]">
            <span className="h-3 w-[70%] bg-black" />
            <span className="h-2 w-full bg-[#d7dce2]"><span className="block h-full w-[84%] bg-[#0759e6]" /></span>
            <span className="h-2 w-full bg-[#d7dce2]"><span className="block h-full w-[58%] bg-[#0759e6]" /></span>
            <span className="h-2 w-full bg-[#d7dce2]"><span className="block h-full w-[35%] bg-[#0759e6]" /></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#e9e9e5]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49.5%,rgba(0,0,0,0.14)_50%,transparent_50.5%),linear-gradient(0deg,transparent_49.5%,rgba(0,0,0,0.14)_50%,transparent_50.5%)] bg-[size:20%_33.33%]" />
      <span className="absolute bottom-[14%] left-[28%] size-[28%] rounded-full border-[3px] border-black bg-[#0759e6] shadow-[inset_-1rem_-1rem_2rem_rgba(0,0,0,0.3)]" />
      <span className="absolute bottom-[9%] left-[43%] size-[38%] rounded-full border-[3px] border-black bg-[#f0201b] shadow-[inset_-1.25rem_-1.25rem_2.5rem_rgba(0,0,0,0.32)]" />
      <span className="absolute right-0 top-0 h-[34%] w-[22%] border-b-2 border-l-2 border-black bg-[#ffd400]" />
    </div>
  );
}
