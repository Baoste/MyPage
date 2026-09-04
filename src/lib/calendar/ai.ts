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

async function post(path: string, body: unknown) {
  const config = settings();
  if (!config.apiKey) throw new Error("尚未配置 Calendar AI API Key。");
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) throw new Error(`AI 服务暂时不可用（${response.status}）。`);
  return payload ?? {};
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
    const payload = await post("/responses", {
      model: config.textModel,
      input: [{ role: "user", content: [
        { type: "input_text", text: prompt },
        ...images.slice(0, 8).map((image) => ({ type: "input_image", image_url: `data:${image.mimeType};base64,${Buffer.from(image.bytes).toString("base64")}` })),
      ] }],
      tools: [{ type: "image_generation", size: "1024x1024", quality: "medium", background: transparent ? "transparent" : "opaque" }],
      tool_choice: { type: "image_generation" },
    });
    const output = (Array.isArray(payload.output) ? payload.output : []) as Array<Record<string, unknown>>;
    const result = output.find((item) => item.type === "image_generation_call")?.result;
    if (typeof result === "string") return Uint8Array.from(Buffer.from(result, "base64"));
    throw new Error("AI 未返回可用图片。");
  }
  const payload = await post("/images/generations", {
    model: config.imageModel,
    prompt,
    size: "1024x1024",
    quality: "medium",
    background: transparent ? "transparent" : "opaque",
  });
  const first = (Array.isArray(payload.data) ? payload.data[0] : null) as Record<string, unknown> | null;
  if (!first || typeof first.b64_json !== "string") throw new Error("AI 未返回可用图片。");
  return Uint8Array.from(Buffer.from(first.b64_json, "base64"));
}

export async function generateCalendarJournal(context: string, images: AiImageInput[]): Promise<CalendarAiResult> {
  const config = settings();
  const imageParts = images.slice(0, 8).map((image) => ({
    type: "input_image",
    image_url: `data:${image.mimeType};base64,${Buffer.from(image.bytes).toString("base64")}`,
  }));
  const textPayload = await post("/responses", {
    model: config.textModel,
    input: [{ role: "user", content: [
      { type: "input_text", text: `你是中文日历手账编辑。根据材料写一段 45～90 字、自然克制、有生活感的第一人称日记，只返回正文。\n\n${context}` },
      ...imageParts,
    ] }],
  });
  const text = responseText(textPayload).trim().slice(0, 4000);
  const coverPrompt = `Square editorial journal collage cover, restrained cool gray paper texture, hand-drawn scrapbook feeling, spacious composition, no readable text. Daily memory context: ${context.slice(0, 1200)}`;
  const stickerPrompt = `A small hand-drawn scrapbook sticker sheet inspired by this day: ${context.slice(0, 700)}. Two simple isolated motifs, black ink and muted warm accent, transparent background, no text.`;
  const [cover, sticker] = await Promise.all([generateImage(coverPrompt, false, images), generateImage(stickerPrompt, true, images)]);
  return {
    text,
    cover: { bytes: cover, mimeType: "image/png" },
    stickers: [{ bytes: sticker, mimeType: "image/png" }],
    meta: { provider: "openai-compatible", textModel: config.textModel, imageModel: config.imageModel, promptVersion: 1, generatedAt: new Date().toISOString() },
  };
}
