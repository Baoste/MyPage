"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FoodImagePicker } from "@/components/private/food/FoodImagePicker";
import { FoodLocationPicker } from "@/components/private/food/FoodLocationPicker";
import type { SelectedFoodUploadImage } from "@/components/private/food/food-upload-types";
import {
  chinaDateTimeLocalToIso,
  toDateTimeLocalValue,
} from "@/lib/food/image-metadata";
import {
  PHOTO_TIMEZONE,
  type PhotoApiErrorResponse,
  type PhotoUploadIntentResponse,
  type PhotoUploadRequestInput,
  type PhotoUploadTarget,
} from "@/lib/photo/contracts";
import { animatePrivateDialogClose } from "@/lib/motion";
import type { FoodLocation } from "@/types";

type UploadPhase = "idle" | "initializing" | "uploading" | "finalizing" | "failed";

interface UploadDraft {
  photoId: string;
  requestId: string;
  targets: PhotoUploadTarget[];
}

const initialLocation: FoodLocation = {
  countryCode: "CN",
  countryName: "中国",
  cityName: "",
};

function responseMessage(value: unknown) {
  return typeof value === "object" && value !== null && "message" in value
    && typeof (value as { message?: unknown }).message === "string"
    ? (value as { message: string }).message
    : "请求失败，请稍后再试。";
}

function parseTags(value: string) {
  return [...new Set(value.split(/[,，\n]+/u).map((tag) => tag.trim()).filter(Boolean))];
}

export function PhotoUploadDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestIdRef = useRef("");
  const activeRequestsRef = useRef(new Set<XMLHttpRequest>());
  const latestImagesRef = useRef<SelectedFoodUploadImage[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<FoodLocation>(initialLocation);
  const [occurredAtLocal, setOccurredAtLocal] = useState("");
  const [timeWasEdited, setTimeWasEdited] = useState(false);
  const [tagsText, setTagsText] = useState("");
  const [images, setImages] = useState<SelectedFoodUploadImage[]>([]);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [draft, setDraft] = useState<UploadDraft | null>(null);
  const [message, setMessage] = useState("");

  const isBusy = ["initializing", "uploading", "finalizing"].includes(phase);
  const isLocked = isBusy || draft !== null;
  const isDirty = Boolean(title || description || tagsText || images.length || location.cityName);

  async function closeWithMotion() {
    await animatePrivateDialogClose(dialogRef.current);
    onClose();
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const activeRequests = activeRequestsRef.current;
    dialog.showModal();
    requestIdRef.current = window.crypto.randomUUID();
    setOccurredAtLocal(toDateTimeLocalValue());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      activeRequests.forEach((request) => request.abort());
      latestImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    latestImagesRef.current = images;
  }, [images]);

  function updateImage(clientId: string, changes: Partial<SelectedFoodUploadImage>) {
    setImages((current) => current.map((image) => image.clientId === clientId ? { ...image, ...changes } : image));
  }

  function changeImages(nextImages: SelectedFoodUploadImage[]) {
    if (!timeWasEdited) setOccurredAtLocal(toDateTimeLocalValue(nextImages[0]?.capturedAt ?? Date.now()));
    setImages(nextImages);
  }

  function buildPayload(): PhotoUploadRequestInput {
    return {
      requestId: requestIdRef.current,
      title: title || undefined,
      description: description || undefined,
      occurredAt: chinaDateTimeLocalToIso(occurredAtLocal) ?? "",
      timezone: PHOTO_TIMEZONE,
      location,
      tags: parseTags(tagsText),
      images: images.map((image) => ({ clientId: image.clientId, width: image.width, height: image.height, byteSize: image.byteSize, mimeType: image.mimeType, capturedAt: image.capturedAt })),
    };
  }

  function validateForm() {
    if (!images.length) return "请至少选择一张图片。";
    if (!location.countryCode || !location.cityName.trim()) return "请选择国家并填写中文城市。";
    if (!chinaDateTimeLocalToIso(occurredAtLocal)) return "请选择有效的拍摄时间。";
    const tags = parseTags(tagsText);
    if (tags.length > 20 || tags.some((tag) => tag.length > 30)) {
      return "标签最多 20 个，每个最多 30 个字符。";
    }
    return null;
  }

  async function initializeIntent() {
    const response = await fetch("/api/private/photos/uploads/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const data = await response.json() as PhotoUploadIntentResponse | PhotoApiErrorResponse;
    if (!response.ok || !data.ok) throw new Error(responseMessage(data));
    if (data.alreadyComplete) return { complete: true as const, draft: null };
    const nextDraft = {
      photoId: data.photoId,
      requestId: data.requestId,
      targets: data.uploads,
    };
    setDraft(nextDraft);
    return { complete: false as const, draft: nextDraft };
  }

  function uploadFile(clientId: string, file: File, uploadUrl: string, contentType: string) {
    return new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      activeRequestsRef.current.add(request);
      updateImage(clientId, { status: "uploading", progress: 1, error: undefined });
      request.open("PUT", uploadUrl);
      request.setRequestHeader("Content-Type", contentType);
      request.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        updateImage(clientId, { progress: Math.min(99, Math.max(1, Math.round((event.loaded / event.total) * 100))) });
      };
      request.onload = () => {
        activeRequestsRef.current.delete(request);
        if (request.status >= 200 && request.status < 300) {
          updateImage(clientId, { status: "uploaded", progress: 100, error: undefined });
          resolve();
        } else reject(new Error(`上传失败（${request.status || "网络错误"}）`));
      };
      request.onerror = () => {
        activeRequestsRef.current.delete(request);
        reject(new Error("网络连接失败。"));
      };
      request.onabort = () => {
        activeRequestsRef.current.delete(request);
        reject(new Error("上传已取消。"));
      };
      request.send(file);
    });
  }

  async function finalizeUpload(activeDraft: UploadDraft) {
    setPhase("finalizing");
    setMessage("正在核对图片并保存照片…");
    const response = await fetch("/api/private/photos/uploads/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId: activeDraft.photoId, requestId: activeDraft.requestId }),
    });
    const data = await response.json() as { ok?: boolean; message?: string };
    if (!response.ok || !data.ok) throw new Error(responseMessage(data));
    setMessage("已经保存，正在刷新画廊…");
    latestImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    latestImagesRef.current = [];
    router.refresh();
    await closeWithMotion();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    const validationMessage = validateForm();
    if (validationMessage) return setMessage(validationMessage);
    try {
      setPhase("initializing");
      setMessage("正在建立安全上传地址…");
      const initialized = draft
        ? { complete: false as const, draft }
        : await initializeIntent();
      if (initialized.complete) {
        router.refresh();
        await closeWithMotion();
        return;
      }
      setPhase("uploading");
      setMessage("正在上传图片，请不要关闭页面…");
      const targets = new Map(initialized.draft.targets.map((target) => [target.clientId, target]));
      const pending = images.filter((image) => image.status !== "uploaded");
      const results: PromiseSettledResult<void>[] = [];
      for (let index = 0; index < pending.length; index += 3) {
        const batch = pending.slice(index, index + 3);
        results.push(...await Promise.allSettled(batch.map(async (image) => {
          const target = targets.get(image.clientId);
          if (!target) throw new Error("缺少图片上传地址。");
          await uploadFile(image.clientId, image.file, target.uploadUrl, image.mimeType);
          if (!image.thumbnailFile) throw new Error("无法生成缩略图。");
          await uploadFile(image.clientId, image.thumbnailFile, target.thumbnailUploadUrl, image.thumbnailFile.type);
        })));
      }
      if (results.some((result) => result.status === "rejected")) {
        setPhase("failed");
        setMessage("部分图片上传失败，请重试后再完成保存。");
        return;
      }
      await finalizeUpload(initialized.draft);
    } catch (error) {
      setPhase("failed");
      setMessage(error instanceof Error ? error.message : "上传失败，请稍后再试。");
    }
  }

  async function retryImage(clientId: string) {
    const image = images.find((item) => item.clientId === clientId);
    if (!image || isBusy) return;
    try {
      setPhase("initializing");
      setMessage("正在更新安全上传地址…");
      const initialized = await initializeIntent();
      if (initialized.complete || !initialized.draft) {
        router.refresh();
        await closeWithMotion();
        return;
      }
      const target = initialized.draft.targets.find((item) => item.clientId === clientId);
      if (!target) throw new Error("缺少图片上传地址。");
      setPhase("uploading");
      await uploadFile(image.clientId, image.file, target.uploadUrl, image.mimeType);
      if (!image.thumbnailFile) throw new Error("无法生成缩略图。");
      await uploadFile(image.clientId, image.thumbnailFile, target.thumbnailUploadUrl, image.thumbnailFile.type);
      setPhase("failed");
      setMessage("这张图片已上传，可继续完成保存。");
    } catch (error) {
      setPhase("failed");
      setMessage(error instanceof Error ? error.message : "重试失败。");
    }
  }

  async function requestClose() {
    if (dialogRef.current?.dataset.closing) return;
    if (isDirty && !window.confirm("放弃这张尚未保存的照片吗？")) return;
    activeRequestsRef.current.forEach((request) => request.abort());
    if (draft) {
      try {
        const response = await fetch("/api/private/photos/uploads/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId: draft.photoId, requestId: draft.requestId }),
        });
        if (!response.ok) throw new Error("清理失败");
      } catch {
        setMessage("暂时无法清理已上传内容，请稍后再关闭。");
        return;
      }
    }
    latestImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    latestImagesRef.current = [];
    await closeWithMotion();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="photo-upload-title"
      className="photo-upload-dialog food-upload-dialog m-auto h-[min(94svh,58rem)] w-[min(96vw,54rem)] max-w-none overflow-hidden border-0 bg-[#f3eee6] p-0 text-[#302d29] shadow-2xl"
      onCancel={(event) => {
        event.preventDefault();
        void requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isBusy) void requestClose();
      }}
    >
      <form onSubmit={submit} className="flex h-full min-h-0 flex-col">
        <header className="flex items-start justify-between gap-6 border-b border-[#cec5b8] px-5 py-5 sm:px-8">
          <div>
            <p className="eyebrow">New photo memory</p>
            <h2 id="photo-upload-title" className="display-type mt-2 text-3xl sm:text-4xl">新增照片</h2>
          </div>
          <button type="button" disabled={isBusy} onClick={() => void requestClose()} aria-label="关闭新增照片" className="grid size-11 shrink-0 place-items-center rounded-full border border-[#bcb3a8] bg-[#fffdf8] text-xl disabled:opacity-40">×</button>
        </header>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-8">
          <FoodImagePicker images={images} disabled={isLocked} onChange={changeImages} onError={setMessage} onRetry={(clientId) => void retryImage(clientId)} />

          <label className="block text-xs font-semibold text-[#5d554e]">
            标题
            <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={isLocked} maxLength={120} placeholder="可以留空" className="mt-2 w-full rounded-xl border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal text-[#302d29]" />
          </label>

          <FoodLocationPicker value={location} disabled={isLocked} onChange={setLocation} />

          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block text-xs font-semibold text-[#5d554e]">
              拍摄时间
              <input type="datetime-local" value={occurredAtLocal} onChange={(event) => { setOccurredAtLocal(event.target.value); setTimeWasEdited(true); }} disabled={isLocked} required className="mt-2 w-full rounded-xl border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal text-[#302d29]" />
            </label>
            <button type="button" disabled={isLocked || !images.length} onClick={() => { setTimeWasEdited(false); setOccurredAtLocal(toDateTimeLocalValue(images[0]?.capturedAt ?? Date.now())); }} className="h-[42px] rounded-full border border-[#bdb3a7] px-4 text-xs font-semibold disabled:opacity-40">读取首张时间</button>
          </div>
          <p className="-mt-5 text-[0.66rem] leading-5 text-[#7b736a]">固定为中国北京时间（{PHOTO_TIMEZONE}）。优先读取 EXIF，没有时使用当前时间。</p>

          <label className="block text-xs font-semibold text-[#5d554e]">
            标签
            <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} disabled={isLocked} placeholder="旅行，家人，日常" className="mt-2 w-full rounded-xl border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal text-[#302d29]" />
            <span className="mt-1 block text-[0.66rem] font-normal text-[#81796f]">使用逗号分隔，最多 20 个。</span>
          </label>

          <label className="block text-xs font-semibold text-[#5d554e]">
            描述
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={isLocked} maxLength={2000} rows={5} placeholder="那天发生了什么，或者想记住的一句话。" className="mt-2 w-full resize-y rounded-xl border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal leading-6 text-[#302d29]" />
            <span className="mt-1 block text-right text-[0.62rem] font-normal text-[#81796f]">{description.length} / 2000</span>
          </label>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#cec5b8] bg-[#eee8de] px-5 py-4 sm:px-8">
          <p aria-live="polite" className={`min-w-0 flex-1 text-xs leading-5 ${phase === "failed" ? "text-[#96392c]" : "text-[#6f675e]"}`}>{message || "图片只会保存到私密目录。"}</p>
          <button type="submit" disabled={isBusy} className="min-w-32 rounded-full bg-[#2e332c] px-5 py-3 text-xs font-semibold tracking-[0.1em] text-white disabled:opacity-50">
            {phase === "initializing" ? "准备中…" : phase === "uploading" ? "上传中…" : phase === "finalizing" ? "保存中…" : draft ? "重试上传" : "开始上传"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
