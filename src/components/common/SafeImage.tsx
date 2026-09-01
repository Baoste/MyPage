"use client";

import Image from "next/image";
import { useState } from "react";

interface SafeImageProps {
  src?: string;
  alt: string;
  sizes: string;
  ratio?: "landscape" | "portrait" | "square";
  priority?: boolean;
  className?: string;
}

const ratios = {
  landscape: "aspect-[4/3]",
  portrait: "aspect-[4/5]",
  square: "aspect-square",
};

export function SafeImage({
  src,
  alt,
  sizes,
  ratio = "landscape",
  priority = false,
  className = "",
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const frameClass = `relative overflow-hidden bg-[#ddd7ca] ${ratios[ratio]} ${className}`;

  if (!src || hasError) {
    return (
      <div className={frameClass} role="img" aria-label={`${alt} — 图片暂不可用`}>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(145deg,transparent_48%,rgba(32,34,30,0.1)_49%,rgba(32,34,30,0.1)_51%,transparent_52%)]"
        />
        <span className="absolute bottom-4 left-4 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#6c695f]">
          图片待上传
        </span>
      </div>
    );
  }

  return (
    <div className={frameClass}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
