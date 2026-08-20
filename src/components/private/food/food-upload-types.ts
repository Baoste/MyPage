import type { FoodImageMimeType } from "@/lib/food/contracts";

export type FoodUploadImageStatus = "ready" | "uploading" | "uploaded" | "error";

export interface SelectedFoodUploadImage {
  clientId: string;
  file: File;
  thumbnailFile: File | null;
  previewUrl: string;
  width: number;
  height: number;
  mimeType: FoodImageMimeType;
  byteSize: number;
  capturedAt?: string;
  status: FoodUploadImageStatus;
  progress: number;
  error?: string;
}
