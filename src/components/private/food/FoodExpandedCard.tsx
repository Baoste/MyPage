"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FoodEditDialog } from "@/components/private/food/FoodEditDialog";
import { foodLocationLabel, formatFoodDateTime } from "@/components/private/food/food-format";
import type { FoodComment, FoodGroupViewModel } from "@/types";

const commentTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

interface CommentsResponse {
  ok?: boolean;
  comments?: FoodComment[];
  comment?: FoodComment;
  message?: string;
}

function formatCommentTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间未知" : commentTimeFormatter.format(date);
}

interface FoodExpandedCardProps {
  group: FoodGroupViewModel;
  initialImageIndex: number;
  mutationsEnabled: boolean;
  onClose: () => void;
}

export function FoodExpandedCard({
  group,
  initialImageIndex,
  mutationsEnabled,
  onClose,
}: FoodExpandedCardProps) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [imageIndex, setImageIndex] = useState(initialImageIndex);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mutationMessage, setMutationMessage] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<FoodComment[]>([]);
  const [commentsStatus, setCommentsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [commentDraft, setCommentDraft] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentFeedback, setCommentFeedback] = useState("");
  const [commentFeedbackIsError, setCommentFeedbackIsError] = useState(false);
  const image = group.images[imageIndex];
  const commentCharacterCount = Array.from(commentDraft).length;
  const normalizedCommentLength = Array.from(commentDraft.trim()).length;

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, []);

  function move(amount: number) {
    setImageIndex((current) => (current + amount + group.images.length) % group.images.length);
  }

  async function loadComments() {
    setCommentsStatus("loading");
    setCommentFeedback("");
    try {
      const response = await fetch(`/api/private/food/groups/${group.id}/comments`, {
        cache: "no-store",
      });
      const data = await response.json() as CommentsResponse;
      if (!response.ok || !data.comments) {
        throw new Error(data.message || "暂时无法读取评论。");
      }
      setComments(data.comments);
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsStatus("error");
      setCommentFeedbackIsError(true);
      setCommentFeedback(error instanceof Error ? error.message : "暂时无法读取评论。");
    }
  }

  function toggleComments() {
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);
    if (nextOpen && (commentsStatus === "idle" || commentsStatus === "error")) {
      void loadComments();
    }
  }

  async function publishComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCommenting || normalizedCommentLength < 1 || commentCharacterCount > 1000) return;

    setIsCommenting(true);
    setCommentFeedback("");
    try {
      const response = await fetch(`/api/private/food/groups/${group.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentDraft }),
      });
      const data = await response.json() as CommentsResponse;
      if (!response.ok || !data.comment) {
        throw new Error(data.message || "暂时无法发布评论。");
      }
      const createdComment = data.comment;
      setComments((current) => current.some((item) => item.id === createdComment.id)
        ? current
        : [...current, createdComment]);
      setCommentsStatus("ready");
      setCommentDraft("");
      setCommentFeedbackIsError(false);
      setCommentFeedback("评论已发布。");
    } catch (error) {
      setCommentFeedbackIsError(true);
      setCommentFeedback(error instanceof Error ? error.message : "暂时无法发布评论。");
    } finally {
      setIsCommenting(false);
    }
  }

  async function deleteGroup() {
    const confirmed = window.confirm(
      `确定删除“${group.category}”这整组记录和全部 ${group.images.length} 张图片吗？删除后无法恢复。`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setMutationMessage("正在删除整组记录…");
    try {
      const response = await fetch(`/api/private/food/groups/${group.id}`, {
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
        aria-labelledby={`food-expanded-title-${group.id}`}
        className="food-expanded-shell overflow-hidden rounded-[1.75rem] border border-[#d7d0c4] bg-[#f7f3ec] text-[#302d29]"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "ArrowLeft" && group.images.length > 1) move(-1);
          if (event.key === "ArrowRight" && group.images.length > 1) move(1);
        }}
      >
        <div className="grid md:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
          <div className="relative aspect-[4/3] overflow-hidden bg-[#dcd5c9] sm:aspect-[16/10] md:aspect-auto md:min-h-[31rem]">
            {image?.imageUrl ? (
              <Image
                unoptimized
                src={image.imageUrl}
                alt={`${group.category}，第 ${imageIndex + 1} 张，共 ${group.images.length} 张`}
                fill
                sizes="(max-width: 767px) 100vw, 55vw"
                className="object-cover"
                priority
              />
            ) : (
              <p className="grid h-full place-items-center px-5 text-sm text-[#71695f]">图片暂时无法显示</p>
            )}

            <span className="absolute left-4 top-4 rounded-full bg-[#f8f4ed] px-3 py-1.5 text-[0.62rem] font-semibold tabular-nums text-[#504a43] shadow-sm">
              {imageIndex + 1} / {group.images.length}
            </span>

            {group.images.length > 1 ? (
              <>
                <button type="button" aria-label="上一张图片" onClick={() => move(-1)} className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-[#f8f4ed] text-lg text-[#3c3833] shadow-md transition-transform hover:scale-105">←</button>
                <button type="button" aria-label="下一张图片" onClick={() => move(1)} className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-[#f8f4ed] text-lg text-[#3c3833] shadow-md transition-transform hover:scale-105">→</button>
              </>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col p-5 sm:p-7 md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-[#877e73]">Food memory</p>
                <h2 id={`food-expanded-title-${group.id}`} className="display-type mt-2 text-[clamp(2.15rem,4vw,3.5rem)] leading-[0.95] text-[#292621]">
                  {group.category}
                </h2>
              </div>
              <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="收起美食详情" className="grid size-11 shrink-0 place-items-center rounded-full border border-[#d3cbbf] bg-[#fffdf8] text-xl text-[#514a43] transition-colors hover:bg-[#ede6da]">×</button>
            </div>

            <div className="mt-6 flex items-center gap-1 text-lg tracking-[0.08em] text-[#a64b2a]" aria-label={group.rating ? `${group.rating} 星` : "未评分"}>
              {group.rating ? `${"★".repeat(group.rating)}${"☆".repeat(5 - group.rating)}` : <span className="text-xs tracking-normal text-[#81786e]">未评分</span>}
            </div>

            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-1">
              <div className="rounded-2xl bg-[#eee8de] px-4 py-3.5">
                <dt className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#837a70]">地点</dt>
                <dd className="mt-1.5 leading-6 text-[#39352f]">{foodLocationLabel(group)}</dd>
              </div>
              <div className="rounded-2xl bg-[#eee8de] px-4 py-3.5">
                <dt className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#837a70]">时间</dt>
                <dd className="mt-1.5 leading-6 text-[#39352f]">{formatFoodDateTime(group)}</dd>
              </div>
              {group.uploadedBy ? (
                <div className="rounded-2xl bg-[#eee8de] px-4 py-3.5">
                  <dt className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#837a70]">上传账号</dt>
                  <dd className="mt-1.5 leading-6 text-[#39352f]">@{group.uploadedBy.username}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-6">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#837a70]">点评</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#514b43]">{group.review || "这次还没有留下点评。"}</p>
            </div>

            <div className="mt-6 border-t border-[#ded6ca] pt-5">
              <button
                type="button"
                aria-expanded={commentsOpen}
                aria-controls={`food-comments-${group.id}`}
                onClick={toggleComments}
                className="inline-flex min-h-10 items-center gap-3 rounded-full border border-[#cfc5b8] bg-[#fffdf8] px-4 text-xs font-semibold tracking-[0.08em] text-[#4e4841] transition-colors hover:border-[#a99d8f] hover:bg-[#eee8de]"
              >
                <span>{commentsOpen ? "收起评论" : "评论"}</span>
                {commentsStatus === "ready" ? (
                  <span className="min-w-5 rounded-full bg-[#30352e] px-1.5 py-0.5 text-center text-[0.58rem] tabular-nums text-white">
                    {comments.length}
                  </span>
                ) : null}
              </button>

              {commentsOpen ? (
                <section id={`food-comments-${group.id}`} aria-label="美食评论" className="mt-5">
                  {commentsStatus === "loading" ? (
                    <p className="py-4 text-xs text-[#776f65]">正在读取评论…</p>
                  ) : null}

                  {commentsStatus === "error" ? (
                    <button
                      type="button"
                      onClick={() => void loadComments()}
                      className="min-h-10 rounded-full border border-[#cda99d] px-4 text-xs font-semibold text-[#963f2e] hover:bg-[#f0dfd8]"
                    >
                      重新读取评论
                    </button>
                  ) : null}

                  {commentsStatus === "ready" ? (
                    <>
                      {comments.length ? (
                        <ol className="space-y-5 border-l border-[#cfc5b8] pl-5">
                          {comments.map((comment) => (
                            <li key={comment.id} className="relative">
                              <span aria-hidden="true" className="absolute -left-[1.43rem] top-1.5 size-2 rounded-full border-2 border-[#f7f3ec] bg-[#a64b2a]" />
                              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <p className="text-xs font-semibold text-[#3f3a34]">@{comment.authorUsername}</p>
                                <time dateTime={comment.createdAt} className="text-[0.6rem] tabular-nums text-[#8b8278]">
                                  {formatCommentTime(comment.createdAt)}
                                </time>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#585149]">{comment.content}</p>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-sm leading-6 text-[#756d64]">还没有评论，留下第一句话。</p>
                      )}

                      <form onSubmit={publishComment} className="mt-6 rounded-2xl bg-[#eee8de] p-4">
                        <label htmlFor={`food-comment-input-${group.id}`} className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#837a70]">
                          写下评论
                        </label>
                        <textarea
                          id={`food-comment-input-${group.id}`}
                          value={commentDraft}
                          onChange={(event) => {
                            setCommentDraft(event.target.value);
                            if (commentFeedback) setCommentFeedback("");
                          }}
                          disabled={isCommenting}
                          rows={3}
                          maxLength={1000}
                          placeholder="说说这顿饭，或留一句给同行的人…"
                          className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[#d0c6b8] bg-[#fffdf8] px-3.5 py-3 text-sm leading-6 text-[#3e3933] placeholder:text-[#9a9187] disabled:opacity-60"
                        />
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <span className={`text-[0.6rem] tabular-nums ${commentCharacterCount > 1000 ? "text-[#96392c]" : "text-[#8a8177]"}`}>
                            {commentCharacterCount} / 1000
                          </span>
                          <button
                            type="submit"
                            disabled={isCommenting || normalizedCommentLength < 1 || commentCharacterCount > 1000}
                            className="min-h-10 rounded-full bg-[#30352e] px-5 text-xs font-semibold tracking-[0.08em] text-white transition-colors hover:bg-[#494e46] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {isCommenting ? "发布中…" : "发布评论"}
                          </button>
                        </div>
                      </form>
                    </>
                  ) : null}

                  <p
                    aria-live="polite"
                    className={`mt-3 min-h-5 text-xs leading-5 ${commentFeedbackIsError ? "text-[#96392c]" : "text-[#65705f]"}`}
                  >
                    {commentFeedback}
                  </p>
                </section>
              ) : null}
            </div>

            {group.images.length > 1 ? (
              <div className="mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="同组图片">
                {group.images.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`查看第 ${index + 1} 张图片`}
                    aria-current={index === imageIndex ? "true" : undefined}
                    onClick={() => setImageIndex(index)}
                    className={`relative size-14 shrink-0 overflow-hidden rounded-xl border-2 transition-opacity ${index === imageIndex ? "border-[#a64b2a]" : "border-transparent opacity-55 hover:opacity-90"}`}
                  >
                    {item.imageUrl ? <Image unoptimized src={item.imageUrl} alt="" fill sizes="3.5rem" className="object-cover" /> : null}
                  </button>
                ))}
              </div>
            ) : null}

            {mutationsEnabled ? (
              <div className="mt-auto pt-7">
                <div className="flex gap-2.5 border-t border-[#ded6ca] pt-5">
                  <button type="button" disabled={isDeleting} onClick={() => setEditOpen(true)} className="flex-1 rounded-full bg-[#2f332d] px-4 py-3 text-xs font-semibold tracking-[0.08em] text-white transition-colors hover:bg-[#454a42] disabled:opacity-40">修改</button>
                  <button type="button" disabled={isDeleting} onClick={() => void deleteGroup()} className="rounded-full border border-[#cda99d] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#9b3f2e] transition-colors hover:bg-[#f0dfd8] disabled:opacity-40">删除</button>
                </div>
                <p aria-live="polite" className="mt-3 text-xs leading-5 text-[#96392c]">{mutationMessage}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {editOpen ? (
        <FoodEditDialog
          group={group}
          onClose={() => setEditOpen(false)}
          onSaved={onClose}
        />
      ) : null}
    </>
  );
}
