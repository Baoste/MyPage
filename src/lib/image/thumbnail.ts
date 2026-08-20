"use client";

const DEFAULT_MAX_DIMENSION = 640;
const DEFAULT_JPEG_QUALITY = 0.82;

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

async function drawThumbnailToCanvas(file: File, maxDimension: number) {
  const imageBitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(imageBitmap.width, imageBitmap.height));
  const width = Math.max(1, Math.round(imageBitmap.width * scale));
  const height = Math.max(1, Math.round(imageBitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    imageBitmap.close();
    throw new Error("Unable to create a thumbnail canvas.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close();
  return { canvas, width, height };
}

async function drawThumbnailFallback(file: File, maxDimension: number) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Unable to decode image."));
      element.src = sourceUrl;
    });
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create a thumbnail canvas.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);
    return { canvas, width, height };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function createThumbnailFile(
  file: File,
  options: { maxDimension?: number } = {},
) {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const mimeType = file.type === "image/png" || file.type === "image/webp"
    ? file.type
    : "image/jpeg";
  const quality = mimeType === "image/jpeg" ? DEFAULT_JPEG_QUALITY : undefined;

  let canvasResult: Awaited<ReturnType<typeof drawThumbnailToCanvas>>;
  try {
    canvasResult = await drawThumbnailToCanvas(file, maxDimension);
  } catch {
    canvasResult = await drawThumbnailFallback(file, maxDimension);
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvasResult.canvas.toBlob((value) => resolve(value), mimeType, quality);
  });
  if (!blob) return null;

  const extension = extensionForMimeType(mimeType);
  const name = file.name.replace(/\.(jpe?g|png|webp)$/iu, "") || "thumbnail";
  return new File([blob], `${name}.thumb.${extension}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}
