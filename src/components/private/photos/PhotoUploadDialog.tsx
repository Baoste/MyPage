"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FoodLocationPicker } from "@/components/private/food/FoodLocationPicker";
import {
  chinaDateTimeLocalToIso,
  inspectFoodImage,
  toDateTimeLocalValue,
} from "@/lib/food/image-metadata";
import {
  PHOTO_TIMEZONE,
  PHOTO_UPLOAD_LIMITS,
  type PhotoApiErrorResponse,
  type PhotoUploadIntentResponse,
  type PhotoUploadRequestInput,
  type PhotoUploadTarget,
} from "@/lib/photo/contracts";
import { animatePrivateDialogClose } from "@/lib/motion";
import type { FoodLocation, PhotoImageMimeType } from "@/types";

type UploadPhase = "idle" | "inspecting" | "initializing" | "uploading" | "finalizing" | "failed";

interface SelectedPhoto {
  clientId: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  mimeType: PhotoImageMimeType;
  byteSize: number;
  capturedAt?: string;
}

interface UploadDraft {
  photoId: string;
  requestId: string;
  target: PhotoUploadTarget;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef("");
  const activeRequestRef = useRef<XMLHttpRequest | null>(null);
  const latestPhotoRef = useRef<SelectedPhoto | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<FoodLocation>(initialLocation);
  const [occurredAtLocal, setOccurredAtLocal] = useState("");
  const [timeWasEdited, setTimeWasEdited] = useState(false);
  const [tagsText, setTagsText] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [draft, setDraft] = useState<UploadDraft | null>(null);
  const [message, setMessage] = useState("");

  const isBusy = ["inspecting", "initializing", "uploading", "finalizing"].includes(phase);
  const isLocked = isBusy || draft !== null;
  const isDirty = Boolean(title || description || tagsText || selectedPhoto || location.cityName);

  async function closeWithMotion() {
    await animatePrivateDialogClose(dialogRef.current);
    onClose();
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    requestIdRef.current = window.crypto.randomUUID();
    setOccurredAtLocal(toDateTimeLocalValue());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      activeRequestRef.current?.abort();
      if (latestPhotoRef.current) URL.revokeObjectURL(latestPhotoRef.current.previewUrl);
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    latestPhotoRef.current = selectedPhoto;
  }, [selectedPhoto]);

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    if (file.size > PHOTO_UPLOAD_LIMITS.maximumImageBytes) {
      setMessage("单张图片不能超过 10MB。");
      return;
    }
    setPhase("inspecting");
    setMessage("正在读取图片信息…");
    try {
      const metadata = await inspectFoodImage(file);
      const next: SelectedPhoto = {
        clientId: window.crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        ...metadata,
      };
      if (selectedPhoto) URL.revokeObjectURL(selectedPhoto.previewUrl);
      setSelectedPhoto(next);
      if (!timeWasEdited) setOccurredAtLocal(toDateTimeLocalValue(next.capturedAt ?? Date.now()));
      setMessage("");
      setPhase("idle");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法读取选择的图片。");
      setPhase("failed");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function buildPayload(photo: SelectedPhoto): PhotoUploadRequestInput {
    return {
      requestId: requestIdRef.current,
      clientId: photo.clientId,
      title: title || undefined,
      description: description || undefined,
      occurredAt: chinaDateTimeLocalToIso(occurredAtLocal) ?? "",
      timezone: PHOTO_TIMEZONE,
      location,
      tags: parseTags(tagsText),
      width: photo.width,
      height: photo.height,
      byteSize: photo.byteSize,
      mimeType: photo.mimeType,
      capturedAt: photo.capturedAt,
    };
  }

  function validateForm() {
    if (!selectedPhoto) return "请选择一张图片。";
    if (!location.countryCode || !location.cityName.trim()) return "请选择国家并填写中文城市。";
    if (!chinaDateTimeLocalToIso(occurredAtLocal)) return "请选择有效的拍摄时间。";
    const tags = parseTags(tagsText);
    if (tags.length > 20 || tags.some((tag) => tag.length > 30)) {
      return "标签最多 20 个，每个最多 30 个字符。";
    }
    return null;
  }

  async function initializeIntent(photo: SelectedPhoto) {
    const response = await fetch("/api/private/photos/uploads/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(photo)),
    });
    const data = await response.json() as PhotoUploadIntentResponse | PhotoApiErrorResponse;
    if (!response.ok || !data.ok) throw new Error(responseMessage(data));
    if (data.alreadyComplete) return { complete: true as const, draft: null };
    if (!data.upload) throw new Error("没有收到安全上传地址。");
    const nextDraft = {
      photoId: data.photoId,
      requestId: data.requestId,
      target: data.upload,
    };
    setDraft(nextDraft);
    return { complete: false as const, draft: nextDraft };
  }

  function uploadFile(photo: SelectedPhoto, target: PhotoUploadTarget) {
    return new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      activeRequestRef.current = request;
      setProgress(1);
      request.open("PUT", target.uploadUrl);
      request.setRequestHeader("Content-Type", photo.mimeType);
      request.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        setProgress(Math.min(99, Math.max(1, Math.round((event.loaded / event.total) * 100))));
      };
      request.onload = () => {
        activeRequestRef.current = null;
        if (request.status >= 200 && request.status < 300) {
          setProgress(100);
          resolve();
        } else reject(new Error(`上传失败（${request.status || "网络错误"}）`));
      };
      request.onerror = () => {
        activeRequestRef.current = null;
        reject(new Error("网络连接失败。"));
      };
      request.onabort = () => {
        activeRequestRef.current = null;
        reject(new Error("上传已取消。"));
      };
      request.send(photo.file);
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
    if (latestPhotoRef.current) URL.revokeObjectURL(latestPhotoRef.current.previewUrl);
    latestPhotoRef.current = null;
    router.refresh();
    await closeWithMotion();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    const validationMessage = validateForm();
    if (validationMessage) return setMessage(validationMessage);
    const photo = selectedPhoto;
    if (!photo) return;
    try {
      setPhase("initializing");
      setMessage("正在建立安全上传地址…");
      const initialized = draft
        ? { complete: false as const, draft }
        : await initializeIntent(photo);
      if (initialized.complete) {
        router.refresh();
        await closeWithMotion();
        return;
      }
      setPhase("uploading");
      setMessage("正在上传图片，请不要关闭页面…");
      await uploadFile(photo, initialized.draft.target);
      await finalizeUpload(initialized.draft);
    } catch (error) {
      setPhase("failed");
      setMessage(error instanceof Error ? error.message : "上传失败，请稍后再试。");
    }
  }

  async function requestClose() {
    if (dialogRef.current?.dataset.closing) return;
    if (isDirty && !window.confirm("放弃这张尚未保存的照片吗？")) return;
    activeRequestRef.current?.abort();
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
    if (latestPhotoRef.current) URL.revokeObjectURL(latestPhotoRef.current.previewUrl);
    latestPhotoRef.current = null;
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
          <fieldset disabled={isLocked}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <legend className="text-sm font-semibold text-[#39342f]">图片</legend>
                <p className="mt-1 text-xs leading-5 text-[#776f66]">JPEG / PNG / WebP，最大 10MB。</p>
              </div>
              <label className={`shrink-0 rounded-full border border-[#9e9488] px-3.5 py-2 text-xs font-semibold text-[#4a433d] ${isLocked ? "pointer-events-none opacity-45" : "cursor-pointer"}`}>
                {phase === "inspecting" ? "正在读取…" : selectedPhoto ? "重新选择" : "选择图片"}
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={isLocked} className="sr-only" onChange={(event) => void chooseFile(event.target.files?.[0])} />
              </label>
            </div>
            {selectedPhoto ? (
              <div className="mt-4 rounded-2xl border border-[#d0c7bb] bg-[#f7f3ec] p-2.5">
                <div className="relative max-h-[26rem] min-h-52 overflow-hidden rounded-xl bg-[#ddd7ca]" style={{ aspectRatio: `${selectedPhoto.width} / ${selectedPhoto.height}` }}>
                  <Image unoptimized src={selectedPhoto.previewUrl} alt="待上传照片预览" fill sizes="42rem" className="object-contain" />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[0.66rem] text-[#71695f]">
                  <span className="max-w-[70%] truncate">{selectedPhoto.file.name}</span>
                  <span>{Math.round(selectedPhoto.byteSize / 1024)}KB · {selectedPhoto.width}×{selectedPhoto.height}</span>
                </div>
                {phase === "uploading" || progress > 0 ? (
                  <div className="px-1 pb-1 pt-2">
                    <progress aria-label="照片上传进度" max={100} value={progress} className="h-1.5 w-full accent-[#a64b2a]" />
                    <p className="mt-1 text-[0.62rem] text-[#696158]">{progress >= 100 ? "已上传" : `上传中 ${progress}%`}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <button type="button" disabled={isLocked} onClick={() => inputRef.current?.click()} className="mt-4 grid min-h-36 w-full place-items-center rounded-2xl border border-dashed border-[#b9afa3] text-sm text-[#756d64] disabled:opacity-45">选择一张照片</button>
            )}
          </fieldset>

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
            <button type="button" disabled={isLocked || !selectedPhoto} onClick={() => { setTimeWasEdited(false); setOccurredAtLocal(toDateTimeLocalValue(selectedPhoto?.capturedAt ?? Date.now())); }} className="h-[42px] rounded-full border border-[#bdb3a7] px-4 text-xs font-semibold disabled:opacity-40">读取照片时间</button>
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
            {phase === "inspecting" ? "读取中…" : phase === "initializing" ? "准备中…" : phase === "uploading" ? "上传中…" : phase === "finalizing" ? "保存中…" : draft ? "重试上传" : "开始上传"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
