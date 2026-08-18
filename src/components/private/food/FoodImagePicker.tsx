"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { SelectedFoodUploadImage } from "@/components/private/food/food-upload-types";
import { FOOD_UPLOAD_LIMITS } from "@/lib/food/contracts";
import { inspectFoodImage } from "@/lib/food/image-metadata";

interface FoodImagePickerProps {
  images: SelectedFoodUploadImage[];
  disabled: boolean;
  onChange: (images: SelectedFoodUploadImage[]) => void;
  onError: (message: string) => void;
  onRetry: (clientId: string) => void;
}

export function FoodImagePicker({
  images,
  disabled,
  onChange,
  onError,
  onRetry,
}: FoodImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  async function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = [...fileList];
    if (images.length + files.length > FOOD_UPLOAD_LIMITS.maximumImages) {
      onError("每组最多选择 12 张图片。");
      return;
    }
    const totalBytes = images.reduce((total, image) => total + image.byteSize, 0)
      + files.reduce((total, file) => total + file.size, 0);
    if (totalBytes > FOOD_UPLOAD_LIMITS.maximumGroupBytes) {
      onError("单组图片总大小不能超过 60MB。");
      return;
    }

    setIsInspecting(true);
    const additions: SelectedFoodUploadImage[] = [];
    try {
      for (const file of files) {
        if (file.size > FOOD_UPLOAD_LIMITS.maximumImageBytes) {
          throw new Error(`${file.name} 超过单张 10MB 的限制。`);
        }
        const metadata = await inspectFoodImage(file);
        additions.push({
          clientId: window.crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          ...metadata,
          status: "ready",
          progress: 0,
        });
      }
      onChange([...images, ...additions]);
    } catch (error) {
      additions.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      onError(error instanceof Error ? error.message : "无法读取选择的图片。");
    } finally {
      setIsInspecting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    const next = [...images];
    const [removed] = next.splice(index, 1);
    URL.revokeObjectURL(removed.previewUrl);
    onChange(next);
  }

  function moveImage(index: number, amount: number) {
    const destination = index + amount;
    if (destination < 0 || destination >= images.length) return;
    const next = [...images];
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange(next);
  }

  return (
    <fieldset aria-disabled={disabled || isInspecting} className="min-w-0">
      <div className="flex items-end justify-between gap-4">
        <div>
          <legend className="text-sm font-semibold text-[#39342f]">图片</legend>
          <p className="mt-1 text-xs leading-5 text-[#776f66]">1～12 张，JPEG / PNG / WebP，单张不超过 10MB。</p>
        </div>
        <label className={`shrink-0 border border-[#9e9488] px-3 py-2 text-xs font-semibold text-[#4a433d] ${disabled || isInspecting ? "pointer-events-none opacity-45" : "cursor-pointer"}`}>
          {isInspecting ? "正在读取…" : "选择图片"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={disabled || isInspecting}
            className="sr-only"
            onChange={(event) => void addFiles(event.target.files)}
          />
        </label>
      </div>

      {images.length > 0 ? (
        <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.clientId} className="min-w-0 border border-[#d0c7bb] bg-[#f7f3ec] p-2">
              <div className="relative aspect-square overflow-hidden bg-[#ddd7ca]">
                <Image unoptimized src={image.previewUrl} alt={`待上传图片 ${index + 1}`} fill sizes="10rem" className="object-cover" />
                <span className="absolute left-1.5 top-1.5 grid size-6 place-items-center bg-[#252822] text-[0.62rem] font-semibold text-white">{index + 1}</span>
              </div>
              <p className="mt-2 truncate text-[0.68rem] text-[#625b53]">{image.file.name}</p>
              <p className="mt-1 text-[0.6rem] text-[#8a8177]">{Math.round(image.byteSize / 1024)}KB · {image.width}×{image.height}</p>
              {image.status !== "ready" ? (
                <div className="mt-2">
                  <progress aria-label={`第 ${index + 1} 张上传进度`} max={100} value={image.progress} className="h-1.5 w-full accent-[#a64b2a]" />
                  <p className={`mt-1 text-[0.62rem] ${image.status === "error" ? "text-[#9b3427]" : "text-[#696158]"}`}>
                    {image.status === "uploading" ? `上传中 ${image.progress}%` : image.status === "uploaded" ? "已上传" : image.error || "上传失败"}
                  </p>
                  {image.status === "error" ? <button type="button" onClick={() => onRetry(image.clientId)} className="mt-1 border-b border-current text-[0.62rem] font-semibold text-[#8d3024]">单独重试</button> : null}
                </div>
              ) : null}
              <div className="mt-2 flex items-center justify-between gap-1 text-[0.62rem] font-semibold text-[#5e574f]">
                <button type="button" disabled={disabled || index === 0} onClick={() => moveImage(index, -1)} className="p-1 disabled:opacity-25" aria-label={`将第 ${index + 1} 张前移`}>←</button>
                <button type="button" disabled={disabled} onClick={() => removeImage(index)} className="p-1 text-[#8d3024]">移除</button>
                <button type="button" disabled={disabled || index === images.length - 1} onClick={() => moveImage(index, 1)} className="p-1 disabled:opacity-25" aria-label={`将第 ${index + 1} 张后移`}>→</button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <button type="button" disabled={disabled || isInspecting} onClick={() => inputRef.current?.click()} className="mt-4 grid min-h-32 w-full place-items-center border border-dashed border-[#b9afa3] text-sm text-[#756d64] disabled:opacity-45">选择这一组的图片</button>
      )}
    </fieldset>
  );
}
