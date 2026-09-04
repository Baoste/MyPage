import "server-only";

interface AiImageInput { mimeType: string; bytes: Uint8Array; }
export interface CalendarAiResult {
  text: string;
  cover: { bytes: Uint8Array; mimeType: "image/png" };
  stickers: Array<{ bytes: Uint8Array; mimeType: "image/png" }>;
  meta: Record<string, unknown>;
}

function settings() {
  const apiKey = process.env.CALENDAR_AI_API_KEY?.trim();
  return {
    apiKey,
    baseUrl: (process.env.CALENDAR_AI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/u, ""),
    textModel: process.env.CALENDAR_AI_TEXT_MODEL?.trim() || "gpt-5.4-mini",
    imageModel: process.env.CALENDAR_AI_IMAGE_MODEL?.trim() || "gpt-image-2",
  };
}

export function isCalendarAiAvailable() { return Boolean(settings().apiKey); }

async function post(path: string, body: unknown, timeoutMs = 120_000) {
  const config = settings();
  if (!config.apiKey) throw new Error("尚未配置 Calendar AI API Key。");
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) throw new Error(`AI 服务暂时不可用（${response.status}）。`);
  return payload ?? {};
}

async function imageBytes(payload: Record<string, unknown>) {
  const first = (Array.isArray(payload.data) ? payload.data[0] : null) as Record<string, unknown> | null;
  if (first && typeof first.b64_json === "string") {
    return Uint8Array.from(Buffer.from(first.b64_json, "base64"));
  }
  if (first && typeof first.url === "string") {
    const response = await fetch(first.url, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error("AI 图片下载失败。");
    const body = await response.arrayBuffer();
    if (body.byteLength < 1 || body.byteLength > 10 * 1024 * 1024) throw new Error("AI 返回的图片大小无效。");
    return new Uint8Array(body);
  }
  throw new Error("AI 未返回可用图片。");
}

async function postImageEdit(prompt: string, images: AiImageInput[], transparent: boolean) {
  const config = settings();
  if (!config.apiKey) throw new Error("尚未配置 Calendar AI API Key。");
  const form = new FormData();
  form.set("model", config.imageModel);
  form.set("prompt", prompt);
  form.set("size", "1024x1024");
  form.set("quality", "medium");
  form.set("background", transparent ? "transparent" : "opaque");
  form.set("response_format", "b64_json");
  for (const [index, image] of images.slice(0, 8).entries()) {
    form.append("image[]", new Blob([new Uint8Array(image.bytes)], { type: image.mimeType }), `source-${index + 1}.${image.mimeType === "image/png" ? "png" : image.mimeType === "image/webp" ? "webp" : "jpg"}`);
  }
  const response = await fetch(`${config.baseUrl}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: form,
    signal: AbortSignal.timeout(300_000),
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) throw new Error(`AI 图片生成暂时不可用（${response.status}）。`);
  return imageBytes(payload ?? {});
}

function responseText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output as Array<Record<string, unknown>>) {
    for (const content of (Array.isArray(item.content) ? item.content : []) as Array<Record<string, unknown>>) {
      if (typeof content.text === "string") return content.text;
    }
  }
  return "今天的片段，被轻轻收进这一格。";
}

async function generateImage(prompt: string, transparent = false, images: AiImageInput[] = []) {
  const config = settings();
  if (images.length) {
    return postImageEdit(prompt, images, transparent);
  }
  const payload = await post("/images/generations", {
    model: config.imageModel,
    prompt,
    size: "1024x1024",
    quality: "medium",
    background: transparent ? "transparent" : "opaque",
    response_format: "b64_json",
  }, 300_000);
  return imageBytes(payload);
}

export async function generateCalendarJournal(context: string, images: AiImageInput[]): Promise<CalendarAiResult> {
  const config = settings();
  const imageParts = images.slice(0, 8).map((image) => ({
    type: "input_image",
    image_url: `data:${image.mimeType};base64,${Buffer.from(image.bytes).toString("base64")}`,
  }));
  const coverPrompt = `Square editorial journal collage cover, restrained cool gray paper texture, hand-drawn scrapbook feeling, calm and spacious composition, no readable text. Daily memory context: ${context.slice(0, 1200)}. Keep approximately 30–40% of the canvas intentionally empty or visually quiet for later handwriting. This reserved writing area should be a clean solid-color paper region, soft neutral background, subtle paper texture, or a large low-detail area with relatively uniform color. Do not place photos, stickers, drawings, or dense decorations in this writing space. Use only a selective subset of the provided reference images when appropriate; it is not necessary to include every image. Arrange visual elements loosely around the edges or in one concentrated area, leaving generous negative space. Avoid dense collage layouts, excessive layering, and edge-to-edge coverage. The empty writing area is a primary compositional element, not leftover space. The overall result should feel like a partially completed personal journal page: understated, airy, handmade, and ready for handwritten notes.`;
  const stickerPrompt = `A small hand-drawn scrapbook sticker sheet inspired by this day: ${context.slice(0, 700)}. Two simple isolated motifs, black ink and muted warm accent, transparent background, no text.`;
  const [textPayload, cover, sticker] = await Promise.all([
    post("/responses", {
      model: config.textModel,
      input: [{ role: "user", content: [
        { type: "input_text", text: `你是中文日历手账编辑。根据材料写一段 20 字以内、自然克制、有生活感的第一人称日记，只返回正文。\n\n${context}` },
        ...imageParts,
      ] }],
    }),
    generateImage(coverPrompt, false, images),
    generateImage(stickerPrompt, true, images),
  ]);
  const text = responseText(textPayload).trim().slice(0, 4000);
  return {
    text,
    cover: { bytes: cover, mimeType: "image/png" },
    stickers: [{ bytes: sticker, mimeType: "image/png" }],
    meta: { provider: "openai-compatible", textModel: config.textModel, imageModel: config.imageModel, promptVersion: 1, generatedAt: new Date().toISOString() },
  };
}
