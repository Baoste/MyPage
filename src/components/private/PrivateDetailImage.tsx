"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type OriginalImageStatus = "idle" | "downloading" | "decoding" | "loaded" | "error";

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
  const [originalProgress, setOriginalProgress] = useState(0);
  const [downloadedOriginalUrl, setDownloadedOriginalUrl] = useState("");
  const originalRequestRef = useRef<XMLHttpRequest | null>(null);
  const originalObjectUrlRef = useRef("");
  const previewUrl = thumbnailUrl || originalUrl;
  const canLoadOriginal = Boolean(
    thumbnailUrl
    && originalUrl
    && thumbnailUrl !== originalUrl,
  );
  const imageClassName = objectFit === "cover" ? "object-cover" : "object-contain";
  const buttonLabel = originalStatus === "downloading" || originalStatus === "decoding"
    ? `加载原图 ${Math.round(originalProgress)}%`
      : originalStatus === "loaded"
        ? "已加载原图"
        : originalStatus === "error"
          ? "重试原图"
          : "查看原图";

  useEffect(() => () => {
    const request = originalRequestRef.current;
    originalRequestRef.current = null;
    request?.abort();
    if (originalObjectUrlRef.current) URL.revokeObjectURL(originalObjectUrlRef.current);
  }, []);

  function clearOriginalObjectUrl() {
    if (!originalObjectUrlRef.current) return;
    URL.revokeObjectURL(originalObjectUrlRef.current);
    originalObjectUrlRef.current = "";
  }

  function failOriginalLoad() {
    clearOriginalObjectUrl();
    setDownloadedOriginalUrl("");
    setOriginalProgress(0);
    setOriginalStatus("error");
  }

  function loadOriginal() {
    if (!canLoadOriginal) return;

    originalRequestRef.current?.abort();
    clearOriginalObjectUrl();
    setDownloadedOriginalUrl("");
    setOriginalProgress(0);
    setOriginalStatus("downloading");

    const request = new XMLHttpRequest();
    originalRequestRef.current = request;
    request.open("GET", originalUrl, true);
    request.responseType = "blob";
    request.timeout = 60_000;
    request.withCredentials = new URL(originalUrl, window.location.href).origin === window.location.origin;

    request.onprogress = (event) => {
      if (originalRequestRef.current !== request) return;
      setOriginalProgress((current) => {
        if (event.lengthComputable && event.total > 0) {
          return Math.max(current, Math.min(94, (event.loaded / event.total) * 94));
        }
        return Math.min(90, current + Math.max(2, (90 - current) * 0.08));
      });
    };

    request.onload = () => {
      if (originalRequestRef.current !== request) return;
      originalRequestRef.current = null;
      if (request.status < 200 || request.status >= 300 || !(request.response instanceof Blob)) {
        failOriginalLoad();
        return;
      }

      const objectUrl = URL.createObjectURL(request.response);
      originalObjectUrlRef.current = objectUrl;
      setOriginalProgress(96);
      setDownloadedOriginalUrl(objectUrl);
      setOriginalStatus("decoding");
    };

    request.onerror = () => {
      if (originalRequestRef.current !== request) return;
      originalRequestRef.current = null;
      setOriginalProgress((current) => Math.max(current, 92));
      setDownloadedOriginalUrl(originalUrl);
      setOriginalStatus("decoding");
    };
    request.ontimeout = () => {
      if (originalRequestRef.current !== request) return;
      originalRequestRef.current = null;
      failOriginalLoad();
    };
    request.send();
  }

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

      {canLoadOriginal && downloadedOriginalUrl ? (
        <Image
          unoptimized
          src={downloadedOriginalUrl}
          alt=""
          aria-hidden="true"
          fill
          sizes={sizes}
          className={`${imageClassName} z-[1] ${originalStatus === "loaded" ? "visible" : "invisible"}`}
          decoding="async"
          fetchPriority="high"
          loading="eager"
          onLoad={() => {
            setOriginalProgress(100);
            setOriginalStatus("loaded");
          }}
          onError={failOriginalLoad}
        />
      ) : null}

      {canLoadOriginal ? (
        <button
          type="button"
          disabled={
            originalStatus === "downloading"
            || originalStatus === "decoding"
            || originalStatus === "loaded"
          }
          onClick={loadOriginal}
          aria-live="polite"
          className="absolute bottom-4 right-4 z-10 overflow-hidden rounded-full border border-white/15 bg-[#191713]/45 px-3 py-2 text-[0.62rem] font-medium tracking-[0.04em] text-white/85 shadow-[0_3px_12px_rgba(0,0,0,0.14)] backdrop-blur-md transition-colors hover:bg-[#191713]/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 disabled:cursor-default"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 origin-left bg-[#a64b2a]/80 transition-transform duration-200 ease-out"
            style={{ transform: `scaleX(${originalProgress / 100})` }}
          />
          <span className="relative z-[1]">{buttonLabel}</span>
        </button>
      ) : null}
    </>
  );
}
