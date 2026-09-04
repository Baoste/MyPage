import type { NextRequest } from "next/server";

const MAXIMUM_EDITABLE_IMAGE_BODY_BYTES = 21 * 1024 * 1024;

export async function readEditableImage(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAXIMUM_EDITABLE_IMAGE_BODY_BYTES) {
    return { ok: false as const, message: "图片内容过大。" };
  }
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const thumbnail = formData.get("thumbnail");
    const width = Number(formData.get("width"));
    const height = Number(formData.get("height"));
    const capturedAtValue = formData.get("capturedAt");
    if (!(image instanceof File) || !(thumbnail instanceof File)) {
      return { ok: false as const, message: "请选择要保存的图片。" };
    }
    return {
      ok: true as const,
      value: {
        bytes: new Uint8Array(await image.arrayBuffer()),
        thumbnailBytes: new Uint8Array(await thumbnail.arrayBuffer()),
        mimeType: image.type,
        thumbnailMimeType: thumbnail.type,
        width,
        height,
        capturedAt: typeof capturedAtValue === "string" && capturedAtValue ? capturedAtValue : undefined,
      },
    };
  } catch {
    return { ok: false as const, message: "无法读取上传图片。" };
  }
}
