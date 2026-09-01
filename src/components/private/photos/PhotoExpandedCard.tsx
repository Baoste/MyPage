"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PrivateCommentSection } from "@/components/private/PrivateCommentSection";
import { PhotoEditDialog } from "@/components/private/photos/PhotoEditDialog";
import {
  formatPhotoDateTime,
  photoLocationLabel,
} from "@/components/private/photos/photo-format";
import type { PhotoViewModel } from "@/types";

export function PhotoExpandedCard({
  photo,
  mutationsEnabled,
  onClose,
}: {
  photo: PhotoViewModel;
  mutationsEnabled: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mutationMessage, setMutationMessage] = useState("");

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, []);

  async function deleteEntry() {
    if (!window.confirm(`确定删除“${photo.title ?? "无题"}”和对应图片吗？删除后无法恢复。`)) return;
    setIsDeleting(true);
    setMutationMessage("正在删除照片…");
    try {
      const response = await fetch(`/api/private/photos/entries/${photo.id}`, {
        method: "DELETE",
      });
      const data = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.message || "删除失败，请稍后再试。");
      onClose();
      router.refresh();
    } catch (error) {
      setMutationMessage(error instanceof Error ? error.message : "删除失败，请稍后再试。");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <section
        aria-labelledby={`photo-expanded-title-${photo.id}`}
        className="food-expanded-shell overflow-hidden rounded-[1.75rem] border border-[#d7d0c4] bg-[#f7f3ec] text-[#302d29]"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <div className="grid md:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
          <div className="relative min-h-[18rem] overflow-hidden bg-[#dcd5c9] sm:min-h-[28rem] md:min-h-[34rem]">
            {photo.imageUrl ? (
              <Image
                unoptimized
                src={photo.imageUrl}
                alt={photo.title ?? `拍摄于 ${formatPhotoDateTime(photo)}`}
                fill
                sizes="(max-width: 767px) 100vw, 55vw"
                className="object-contain"
              />
            ) : (
              <p className="grid h-full place-items-center px-5 text-sm text-[#71695f]">
                图片暂时无法显示
              </p>
            )}
          </div>

          <div className="flex min-w-0 flex-col p-5 sm:p-7 md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-[#877e73]">Photo memory</p>
                <h2
                  id={`photo-expanded-title-${photo.id}`}
                  className="display-type mt-2 break-words text-[clamp(2.15rem,4vw,3.5rem)] leading-[0.95] text-[#292621]"
                >
                  {photo.title ?? "无题"}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="收起照片详情"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-[#d3cbbf] bg-[#fffdf8] text-xl text-[#514a43] transition-colors hover:bg-[#ede6da]"
              >
                ×
              </button>
            </div>

            <dl className="mt-7 grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-1">
              <div className="rounded-2xl bg-[#eee8de] px-4 py-3.5">
                <dt className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#837a70]">地点</dt>
                <dd className="mt-1.5 leading-6 text-[#39352f]">{photoLocationLabel(photo)}</dd>
              </div>
              <div className="rounded-2xl bg-[#eee8de] px-4 py-3.5">
                <dt className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#837a70]">时间</dt>
                <dd className="mt-1.5 leading-6 text-[#39352f]">{formatPhotoDateTime(photo)}</dd>
              </div>
              {photo.uploadedBy ? (
                <div className="rounded-2xl bg-[#eee8de] px-4 py-3.5">
                  <dt className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#837a70]">上传账号</dt>
                  <dd className="mt-1.5 leading-6 text-[#39352f]">@{photo.uploadedBy.username}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-6">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#837a70]">描述</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#514b43]">
                {photo.description || "这张照片还没有留下描述。"}
              </p>
            </div>

            {photo.tags.length ? (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="照片标签">
                {photo.tags.map((tag) => (
                  <li key={tag} className="rounded-full border border-[#d1c8bc] bg-[#fffdf8] px-3 py-1.5 text-[0.64rem] text-[#665f56]">
                    #{tag}
                  </li>
                ))}
              </ul>
            ) : null}

            {mutationsEnabled ? (
              <div className="mt-auto pt-7">
                <div className="flex gap-2.5 border-t border-[#ded6ca] pt-5">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setEditOpen(true)}
                    className="flex-1 rounded-full bg-[#2f332d] px-4 py-3 text-xs font-semibold tracking-[0.08em] text-white transition-colors hover:bg-[#454a42] disabled:opacity-40"
                  >
                    修改
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => void deleteEntry()}
                    className="rounded-full border border-[#cda99d] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#9b3f2e] transition-colors hover:bg-[#f0dfd8] disabled:opacity-40"
                  >
                    删除
                  </button>
                </div>
                <p aria-live="polite" className="mt-3 text-xs leading-5 text-[#96392c]">
                  {mutationMessage}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <PrivateCommentSection
        key={photo.id}
        endpoint={`/api/private/photos/entries/${photo.id}/comments`}
        sectionId={`photo-comments-${photo.id}`}
        ariaLabel="照片评论"
        placeholder="说说这张照片，或留一句给同行的人…"
      />

      {editOpen ? (
        <PhotoEditDialog
          photo={photo}
          onClose={() => setEditOpen(false)}
          onSaved={onClose}
        />
      ) : null}
    </>
  );
}
