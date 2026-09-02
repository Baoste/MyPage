"use client";

import Image from "next/image";
import { useState } from "react";

type OriginalImageStatus = "idle" | "loading" | "loaded" | "error";

export function PrivateDetailImage({
  thumbnailUrl,
  originalUrl,
  alt,
  sizes,
  objectFit,
}: {
  thumbnailUrl: string;
  originalUrl: string;
  alt: string;
  sizes: string;
  objectFit: "cover" | "contain";
}) {
  const [originalStatus, setOriginalStatus] = useState<OriginalImageStatus>("idle");
  const previewUrl = thumbnailUrl || originalUrl;
  const canLoadOriginal = Boolean(
    thumbnailUrl
    && originalUrl
    && thumbnailUrl !== originalUrl,
  );
  const originalRequested = originalStatus === "loading" || originalStatus === "loaded";
  const imageClassName = objectFit === "cover" ? "object-cover" : "object-contain";
  const buttonLabel = originalStatus === "loading"
    ? "正在加载原图…"
    : originalStatus === "loaded"
      ? "已加载原图"
      : originalStatus === "error"
        ? "重试原图"
        : "查看原图";

  if (!previewUrl) return null;

  return (
    <>
      <Image
        unoptimized
        src={previewUrl}
        alt={alt}
        fill
        sizes={sizes}
        className={imageClassName}
        decoding="async"
        fetchPriority="low"
      />

      {canLoadOriginal && originalRequested ? (
        <Image
          unoptimized
          src={originalUrl}
          alt=""
          aria-hidden="true"
          fill
          sizes={sizes}
          className={`${imageClassName} z-[1] ${originalStatus === "loaded" ? "visible" : "invisible"}`}
          decoding="async"
          fetchPriority="high"
          loading="eager"
          onLoad={() => setOriginalStatus("loaded")}
          onError={() => setOriginalStatus("error")}
        />
      ) : null}

      {originalStatus === "loading" ? (
        <span
          aria-hidden="true"
          className="private-original-load-progress absolute inset-0 z-[5] pointer-events-none"
        />
      ) : null}

      {canLoadOriginal ? (
        <button
          type="button"
          disabled={originalStatus === "loading" || originalStatus === "loaded"}
          onClick={() => setOriginalStatus("loading")}
          aria-live="polite"
          className="absolute bottom-4 right-4 z-10 rounded-full border border-white/15 bg-[#191713]/35 px-3 py-2 text-[0.62rem] font-medium tracking-[0.04em] text-white/75 shadow-[0_3px_12px_rgba(0,0,0,0.14)] backdrop-blur-md transition-colors hover:bg-[#191713]/55 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 disabled:cursor-default disabled:opacity-65"
        >
          {buttonLabel}
        </button>
      ) : null}
    </>
  );
}
