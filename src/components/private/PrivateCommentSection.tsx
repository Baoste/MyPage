"use client";

import { useState, type FormEvent } from "react";
import type { PrivateComment } from "@/types";

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
  comments?: PrivateComment[];
  comment?: PrivateComment;
  message?: string;
}

interface PrivateCommentSectionProps {
  endpoint: string;
  sectionId: string;
  ariaLabel: string;
  placeholder: string;
}

function formatCommentTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间未知" : commentTimeFormatter.format(date);
}

export function PrivateCommentSection({
  endpoint,
  sectionId,
  ariaLabel,
  placeholder,
}: PrivateCommentSectionProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PrivateComment[]>([]);
  const [commentsStatus, setCommentsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [commentDraft, setCommentDraft] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentFeedback, setCommentFeedback] = useState("");
  const [commentFeedbackIsError, setCommentFeedbackIsError] = useState(false);
  const commentCharacterCount = Array.from(commentDraft).length;
  const normalizedCommentLength = Array.from(commentDraft.trim()).length;

  async function loadComments() {
    setCommentsStatus("loading");
    setCommentFeedback("");
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
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
      const response = await fetch(endpoint, {
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

  return (
    <section
      id={sectionId}
      aria-labelledby={`${sectionId}-title`}
      className="mt-4 rounded-[1.75rem] border border-[#d7d0c4] bg-[#f7f3ec] px-5 py-5 text-[#302d29] shadow-[0_18px_48px_rgba(47,40,31,0.1)] sm:px-7 sm:py-6"
    >
      <div className="flex items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.17em] text-[#877e73]">Conversation</p>
          <div className="mt-1.5 flex items-center gap-3">
            <h3 id={`${sectionId}-title`} className="display-type text-2xl leading-none text-[#292621]">
              {ariaLabel}
            </h3>
            {commentsStatus === "ready" ? (
              <span className="min-w-5 rounded-full bg-[#30352e] px-1.5 py-0.5 text-center text-[0.58rem] tabular-nums text-white">
                {comments.length}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          aria-expanded={commentsOpen}
          aria-controls={`${sectionId}-body`}
          onClick={toggleComments}
          className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-[#cfc5b8] bg-[#fffdf8] px-4 text-xs font-semibold tracking-[0.08em] text-[#4e4841] transition-colors hover:border-[#a99d8f] hover:bg-[#eee8de]"
        >
          {commentsOpen ? "收起" : "展开"}
        </button>
      </div>

      {commentsOpen ? (
        <div id={`${sectionId}-body`} className="mt-6 border-t border-[#ded6ca] pt-6">
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
                <label htmlFor={`${sectionId}-input`} className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#837a70]">
                  写下评论
                </label>
                <textarea
                  id={`${sectionId}-input`}
                  value={commentDraft}
                  onChange={(event) => {
                    setCommentDraft(event.target.value);
                    if (commentFeedback) setCommentFeedback("");
                  }}
                  disabled={isCommenting}
                  rows={3}
                  maxLength={1000}
                  placeholder={placeholder}
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
        </div>
      ) : null}
    </section>
  );
}
