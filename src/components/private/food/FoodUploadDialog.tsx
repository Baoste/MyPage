"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FoodImagePicker } from "@/components/private/food/FoodImagePicker";
import { FoodLocationPicker } from "@/components/private/food/FoodLocationPicker";
import type { SelectedFoodUploadImage } from "@/components/private/food/food-upload-types";
import type {
  FoodApiErrorResponse,
  FoodUploadIntentResponse,
  FoodUploadRequestInput,
  FoodUploadTarget,
} from "@/lib/food/contracts";
import { FOOD_TIMEZONE } from "@/lib/food/contracts";
import { chinaDateTimeLocalToIso, toDateTimeLocalValue } from "@/lib/food/image-metadata";
import type { FoodLocation, FoodRating } from "@/types";

type UploadPhase = "idle" | "initializing" | "uploading" | "finalizing" | "failed";

interface UploadDraft {
  groupId: string;
  requestId: string;
  targets: FoodUploadTarget[];
}

interface FoodUploadDialogProps {
  onClose: () => void;
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

export function FoodUploadDialog({ onClose }: FoodUploadDialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestIdRef = useRef("");
  const activeRequestsRef = useRef(new Set<XMLHttpRequest>());
  const latestImagesRef = useRef<SelectedFoodUploadImage[]>([]);
  const [category, setCategory] = useState("");
  const [review, setReview] = useState("");
  const [rating, setRating] = useState<FoodRating | 0>(0);
  const [location, setLocation] = useState<FoodLocation>(initialLocation);
  const [occurredAtLocal, setOccurredAtLocal] = useState("");
  const [timeWasEdited, setTimeWasEdited] = useState(false);
  const [images, setImages] = useState<SelectedFoodUploadImage[]>([]);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [draft, setDraft] = useState<UploadDraft | null>(null);
  const [message, setMessage] = useState("");

  const isBusy = phase === "initializing" || phase === "uploading" || phase === "finalizing";
  const isLocked = isBusy || draft !== null;
  const isDirty = Boolean(category || review || rating || images.length || location.cityName);

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
    setImages((current) => current.map((image) =>
      image.clientId === clientId ? { ...image, ...changes } : image,
    ));
  }

  function changeImages(nextImages: SelectedFoodUploadImage[]) {
    if (!timeWasEdited) {
      setOccurredAtLocal(toDateTimeLocalValue(nextImages[0]?.capturedAt ?? Date.now()));
    }
    setImages(nextImages);
  }

  function uploadFile(image: SelectedFoodUploadImage, target: FoodUploadTarget) {
    return new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      activeRequestsRef.current.add(request);
      updateImage(image.clientId, { status: "uploading", progress: 1, error: undefined });
      request.open("PUT", target.uploadUrl);
      request.setRequestHeader("Content-Type", image.mimeType);
      request.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        updateImage(image.clientId, {
          progress: Math.min(99, Math.max(1, Math.round((event.loaded / event.total) * 100))),
        });
      };
      request.onload = () => {
        activeRequestsRef.current.delete(request);
        if (request.status >= 200 && request.status < 300) {
          updateImage(image.clientId, { status: "uploaded", progress: 100, error: undefined });
          resolve();
        } else {
          const error = `上传失败（${request.status || "网络错误"}）`;
          updateImage(image.clientId, { status: "error", progress: 0, error });
          reject(new Error(error));
        }
      };
      request.onerror = () => {
        activeRequestsRef.current.delete(request);
        updateImage(image.clientId, { status: "error", progress: 0, error: "网络连接失败" });
        reject(new Error("网络连接失败"));
      };
      request.onabort = () => {
        activeRequestsRef.current.delete(request);
        updateImage(image.clientId, { status: "error", progress: 0, error: "上传已取消" });
        reject(new Error("上传已取消"));
      };
      request.send(image.file);
    });
  }

  function buildPayload(): FoodUploadRequestInput {
    return {
      requestId: requestIdRef.current,
      category,
      review: review || undefined,
      rating: rating as FoodRating,
      occurredAt: chinaDateTimeLocalToIso(occurredAtLocal) ?? "",
      timezone: FOOD_TIMEZONE,
      location,
      images: images.map((image) => ({
        clientId: image.clientId,
        width: image.width,
        height: image.height,
        mimeType: image.mimeType,
        byteSize: image.byteSize,
        capturedAt: image.capturedAt,
      })),
    };
  }

  function validateForm() {
    if (!images.length) return "请至少选择一张图片。";
    if (!category.trim()) return "请填写分类。";
    if (!location.countryCode || !location.cityName.trim()) return "请选择国家并填写城市。";
    if (!chinaDateTimeLocalToIso(occurredAtLocal)) return "请选择有效的发生时间。";
    if (!rating) return "请选择 1～5 星评分。";
    return null;
  }

  async function initializeIntent() {
    const response = await fetch("/api/private/food/uploads/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const data = await response.json() as FoodUploadIntentResponse | FoodApiErrorResponse;
    if (!response.ok || !data.ok) throw new Error(responseMessage(data));
    if (data.alreadyComplete) return { complete: true as const, draft: null };
    const nextDraft = {
      groupId: data.groupId,
      requestId: data.requestId,
      targets: data.uploads,
    };
    setDraft(nextDraft);
    return { complete: false as const, draft: nextDraft };
  }

  async function finalizeUpload(activeDraft: UploadDraft) {
    setPhase("finalizing");
    setMessage("正在核对图片并保存这组记录…");
    const response = await fetch("/api/private/food/uploads/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: activeDraft.groupId, requestId: activeDraft.requestId }),
    });
    const data = await response.json() as { ok?: boolean; message?: string };
    if (!response.ok || !data.ok) throw new Error(responseMessage(data));
    setMessage("已经保存。正在刷新画廊…");
    latestImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    latestImagesRef.current = [];
    router.refresh();
    onClose();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    const validationMessage = validateForm();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    try {
      setMessage("正在建立安全上传地址…");
      setPhase("initializing");
      const initialized = draft
        ? { complete: false as const, draft }
        : await initializeIntent();
      if (initialized.complete) {
        router.refresh();
        onClose();
        return;
      }

      setPhase("uploading");
      setMessage("正在上传图片，请不要关闭页面…");
      const targets = new Map(initialized.draft.targets.map((target) => [target.clientId, target]));
      const pending = images.filter((image) => image.status !== "uploaded");
      const results: PromiseSettledResult<void>[] = [];
      for (let index = 0; index < pending.length; index += 3) {
        const batch = pending.slice(index, index + 3);
        results.push(...await Promise.allSettled(batch.map((image) => {
          const target = targets.get(image.clientId);
          return target ? uploadFile(image, target) : Promise.reject(new Error("缺少图片上传地址"));
        })));
      }
      if (results.some((result) => result.status === "rejected")) {
        setPhase("failed");
        setMessage("部分图片上传失败，可以单独重试后再完成保存。");
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
      setMessage("正在更新安全上传地址…");
      setPhase("initializing");
      const initialized = await initializeIntent();
      if (initialized.complete || !initialized.draft) {
        router.refresh();
        onClose();
        return;
      }
      const target = initialized.draft.targets.find((item) => item.clientId === clientId);
      if (!target) throw new Error("缺少图片上传地址。");
      setPhase("uploading");
      await uploadFile(image, target);
      setPhase("failed");
      setMessage("这张图片已上传。点击“完成保存”继续。 ");
    } catch (error) {
      setPhase("failed");
      setMessage(error instanceof Error ? error.message : "重试失败。");
    }
  }

  async function requestClose() {
    if (isDirty && !window.confirm("放弃这次尚未保存的美食记录吗？")) return;
    activeRequestsRef.current.forEach((request) => request.abort());
    if (draft) {
      try {
        const response = await fetch("/api/private/food/uploads/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: draft.groupId, requestId: draft.requestId }),
        });
        if (!response.ok) throw new Error("清理失败");
      } catch {
        setMessage("暂时无法清理已上传内容，请稍后再关闭。");
        return;
      }
    }
    latestImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    latestImagesRef.current = [];
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="food-upload-title"
      className="food-upload-dialog m-auto h-[min(94svh,58rem)] w-[min(96vw,54rem)] max-w-none overflow-hidden border-0 bg-[#f3eee6] p-0 text-[#302d29] shadow-2xl"
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
            <p className="eyebrow">New food memory</p>
            <h2 id="food-upload-title" className="display-type mt-2 text-3xl sm:text-4xl">新增一组记录</h2>
          </div>
          <button type="button" disabled={isBusy} onClick={() => void requestClose()} aria-label="关闭新增美食记录" className="grid size-11 shrink-0 place-items-center border border-[#bcb3a8] text-xl disabled:opacity-40">×</button>
        </header>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-8">
          <FoodImagePicker images={images} disabled={isLocked} onChange={changeImages} onError={setMessage} onRetry={(id) => void retryImage(id)} />

          <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
            <label className="block text-xs font-semibold text-[#5d554e]">
              分类
              <input value={category} onChange={(event) => setCategory(event.target.value)} disabled={isLocked} required maxLength={40} placeholder="例如：火锅、甜品、家常菜" className="mt-2 w-full border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal text-[#302d29]" />
            </label>
            <fieldset disabled={isLocked}>
              <legend className="text-xs font-semibold text-[#5d554e]">评分</legend>
              <div className="mt-2 flex h-[42px] items-center gap-1 border border-[#bdb3a7] bg-[#fbf8f2] px-3" role="radiogroup" aria-label="评分">
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value} className="cursor-pointer">
                    <input type="radio" name="food-rating" value={value} checked={rating === value} onChange={() => setRating(value as FoodRating)} className="sr-only" />
                    <span aria-hidden="true" className={`text-xl ${rating >= value ? "text-[#a64b2a]" : "text-[#c9c0b4]"}`}>★</span>
                    <span className="sr-only">{value} 星</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <FoodLocationPicker value={location} disabled={isLocked} onChange={setLocation} />

          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block text-xs font-semibold text-[#5d554e]">
              发生时间
              <input type="datetime-local" value={occurredAtLocal} onChange={(event) => { setOccurredAtLocal(event.target.value); setTimeWasEdited(true); }} disabled={isLocked} required className="mt-2 w-full border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal text-[#302d29]" />
            </label>
            <button type="button" disabled={isLocked || !images.length} onClick={() => { setTimeWasEdited(false); setOccurredAtLocal(toDateTimeLocalValue(images[0]?.capturedAt ?? Date.now())); }} className="h-[42px] border border-[#bdb3a7] px-3 text-xs font-semibold disabled:opacity-40">重新读取第一张</button>
          </div>
          <p className="-mt-5 text-[0.66rem] leading-5 text-[#7b736a]">时区固定为中国北京时间（{FOOD_TIMEZONE}）。没有拍摄时间时使用当前北京时间，手动修改后不会被图片排序覆盖。</p>

          <label className="block text-xs font-semibold text-[#5d554e]">
            点评
            <textarea value={review} onChange={(event) => setReview(event.target.value)} disabled={isLocked} maxLength={2000} rows={5} placeholder="那天的味道、心情，或者想记住的一句话。" className="mt-2 w-full resize-y border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal leading-6 text-[#302d29]" />
            <span className="mt-1 block text-right text-[0.62rem] font-normal text-[#81796f]">{review.length} / 2000</span>
          </label>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#cec5b8] bg-[#eee8de] px-5 py-4 sm:px-8">
          <p aria-live="polite" className={`min-w-0 flex-1 text-xs leading-5 ${phase === "failed" ? "text-[#96392c]" : "text-[#6f675e]"}`}>{message || "图片只会上传到私有空间。"}</p>
          <button type="submit" disabled={isBusy} className="min-w-32 bg-[#2e332c] px-5 py-3 text-xs font-semibold tracking-[0.1em] text-white disabled:opacity-50">
            {phase === "initializing" ? "准备中…" : phase === "uploading" ? "上传中…" : phase === "finalizing" ? "保存中…" : draft ? "完成保存" : "开始上传"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
