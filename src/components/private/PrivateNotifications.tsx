"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PrivateNotification } from "@/types";

type NotificationResponse = {
  ok: boolean;
  notifications?: PrivateNotification[];
  unreadCount?: number;
  available?: boolean;
  message?: string;
};

function notificationText(notification: PrivateNotification) {
  if (notification.kind === "photo_published") return `@${notification.actorUsername} 发布了照片组「${notification.resourceLabel}」`;
  if (notification.kind === "food_published") return `@${notification.actorUsername} 发布了美食记录「${notification.resourceLabel}」`;
  if (notification.kind === "photo_commented") return `@${notification.actorUsername} 评论了你的照片「${notification.resourceLabel}」`;
  return `@${notification.actorUsername} 评论了你的美食记录「${notification.resourceLabel}」`;
}

function notificationTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function PrivateNotifications() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<PrivateNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/private/notifications", { cache: "no-store" });
      const data = await response.json() as NotificationResponse;
      if (!response.ok || !data.ok) throw new Error(data.message || "暂时无法读取通知。");
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      setAvailable(data.available !== false);
      setMessage("");
      return data;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "暂时无法读取通知。");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void loadNotifications(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadNotifications();
    }, 30_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadNotifications();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  async function markRead(count = unreadCount) {
    if (count < 1) return;
    try {
      const response = await fetch("/api/private/notifications", { method: "POST" });
      if (!response.ok) return;
      const now = new Date().toISOString();
      setUnreadCount(0);
      setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt: now }));
    } catch {
      // Polling will retry without hiding unread notifications.
    }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setLoading(true);
    const loaded = await loadNotifications();
    await markRead(loaded?.unreadCount ?? unreadCount);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={unreadCount ? `${unreadCount} 条未读通知` : "通知"}
        aria-expanded={open}
        aria-controls="private-notification-panel"
        onClick={() => void toggle()}
        className="relative grid size-8 place-items-center rounded-full text-[#6d6257] transition-colors hover:bg-[#e6ded2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64b2a]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="size-[1.05rem]">
          <path d="M6.8 9.6a5.2 5.2 0 0 1 10.4 0c0 5.1 2.1 5.8 2.1 5.8H4.7s2.1-.7 2.1-5.8Z" />
          <path d="M9.8 18.2a2.4 2.4 0 0 0 4.4 0" />
        </svg>
        {unreadCount > 0 ? (
          <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#b42f25] px-1 text-[0.58rem] font-bold leading-none tabular-nums text-white shadow-[0_2px_7px_rgba(113,28,22,0.3)] ring-2 ring-[#f3eee6]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section
          id="private-notification-panel"
          aria-label="通知列表"
          className="fixed right-3 top-[4.6rem] z-[80] w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[#cfc5b8] bg-[#f8f4ed] text-[#302d29] shadow-[0_20px_55px_rgba(48,38,29,0.22)] sm:right-6"
        >
          <header className="flex items-center justify-between border-b border-[#d9d0c4] px-4 py-3.5">
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#8a7f73]">Updates</p>
              <h2 className="display-type mt-0.5 text-xl">通知</h2>
            </div>
            <span className="text-[0.62rem] text-[#83786d]">最近 {notifications.length} 条
            </span>
          </header>

          <div className="max-h-[min(30rem,calc(100svh-6rem))] overflow-y-auto overscroll-contain">
            {loading ? <p className="px-5 py-9 text-center text-xs text-[#776d63]">正在读取通知…</p> : null}
            {!loading && !available ? <p className="px-5 py-9 text-center text-xs leading-5 text-[#776d63]">通知功能尚未启用，请先执行最新数据库 Migration。</p> : null}
            {!loading && available && message ? <p className="px-5 py-9 text-center text-xs leading-5 text-[#96392c]">{message}</p> : null}
            {!loading && available && !message && notifications.length === 0 ? <p className="px-5 py-9 text-center text-xs text-[#776d63]">暂无通知</p> : null}
            {!loading && available && !message && notifications.length > 0 ? (
              <ol className="divide-y divide-[#ded6cb]">
                {notifications.map((notification) => (
                  <li key={notification.id} className="relative">
                    {!notification.readAt ? <span className="absolute left-3 top-5 size-1.5 rounded-full bg-[#b42f25]" aria-hidden="true" /> : null}
                    <Link href={notification.resourceType === "photo" ? "/yfxl99/photos" : "/yfxl99/food"} onClick={() => setOpen(false)} className="block px-5 py-4 transition-colors hover:bg-[#eee7dc] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#a64b2a]">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-xs font-semibold leading-5 text-[#39342f]">{notificationText(notification)}</p>
                        <time className="shrink-0 pt-0.5 text-[0.58rem] tabular-nums text-[#8a8075]">{notificationTime(notification.createdAt)}</time>
                      </div>
                      {notification.commentExcerpt ? <p className="mt-1.5 line-clamp-2 border-l-2 border-[#c8b9aa] pl-2.5 text-[0.68rem] leading-5 text-[#6c635a]">“{notification.commentExcerpt}”</p> : null}
                    </Link>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
