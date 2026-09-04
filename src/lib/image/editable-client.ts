"use client";

import { FOOD_UPLOAD_LIMITS } from "@/lib/food/contracts";
import { inspectFoodImage } from "@/lib/food/image-metadata";
import { createThumbnailFile } from "@/lib/image/thumbnail";

export interface PreparedEditableImage {
  file: File;
  thumbnailFile: File;
  previewUrl: string;
  width: number;
  height: number;
  capturedAt?: string;
}

export async function prepareEditableImage(file: File) {
  if (file.size > FOOD_UPLOAD_LIMITS.maximumImageBytes) {
    throw new Error("单张图片不能超过 10MB。");
  }
  const metadata = await inspectFoodImage(file);
  const thumbnailFile = await createThumbnailFile(file);
  if (!thumbnailFile) throw new Error("无法生成缩略图。");
  return {
    file,
    thumbnailFile,
    previewUrl: URL.createObjectURL(file),
    width: metadata.width,
    height: metadata.height,
    capturedAt: metadata.capturedAt,
  } satisfies PreparedEditableImage;
}

export function editableImageFormData(image: PreparedEditableImage) {
  const formData = new FormData();
  formData.set("image", image.file);
  formData.set("thumbnail", image.thumbnailFile);
  formData.set("width", String(image.width));
  formData.set("height", String(image.height));
  if (image.capturedAt) formData.set("capturedAt", image.capturedAt);
  return formData;
}
