"use client";

import { useEffect, useRef, useState } from "react";
import { CALENDAR_MAX_MONTH_NOTE_LENGTH } from "@/lib/calendar/contracts";
import styles from "./CalendarPage.module.css";

type SaveStatus = "saved" | "unsaved" | "saving" | "error";

export default function CalendarNotes({ month, initialValue, initialError = "" }: {
  month: string;
  initialValue: string;
  initialError?: string;
}) {
  const [note, setNote] = useState(initialValue);
  const [status, setStatus] = useState<SaveStatus>(initialError ? "error" : "saved");
  const [error, setError] = useState(initialError);
  const noteRef = useRef(initialValue);
  const lastSavedRef = useRef(initialValue);
  const queuedValueRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const timerRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.clearTimeout(timerRef.current);
    };
  }, []);

  async function flushQueue() {
    if (savingRef.current) return;
    savingRef.current = true;
    while (queuedValueRef.current !== null) {
      const value = queuedValueRef.current;
      queuedValueRef.current = null;
      if (value === lastSavedRef.current) continue;
      if (mountedRef.current) {
        setStatus("saving");
        setError("");
      }
      try {
        const response = await fetch("/api/private/calendar/month-note", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month, content: value }),
          keepalive: true,
        });
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(body.error || "Notes 保存失败。");
        lastSavedRef.current = value;
        if (mountedRef.current) setStatus(noteRef.current === value && queuedValueRef.current === null ? "saved" : "unsaved");
      } catch (reason) {
        if (queuedValueRef.current === null) queuedValueRef.current = noteRef.current;
        if (mountedRef.current) {
          setStatus("error");
          setError(reason instanceof Error ? reason.message : "Notes 保存失败。");
        }
        break;
      }
    }
    savingRef.current = false;
  }

  function queueSave(value: string) {
    window.clearTimeout(timerRef.current);
    queuedValueRef.current = value;
    void flushQueue();
  }

  function change(value: string) {
    noteRef.current = value;
    setNote(value);
    setError("");
    setStatus(value === lastSavedRef.current ? "saved" : "unsaved");
    window.clearTimeout(timerRef.current);
    if (value !== lastSavedRef.current) timerRef.current = window.setTimeout(() => queueSave(noteRef.current), 700);
  }

  const statusText = status === "saving"
    ? "保存中…"
    : status === "unsaved"
      ? "待保存"
      : status === "error"
        ? error
        : "已自动保存";

  return <aside className={styles.notesPanel} aria-label="本月 Notes">
    <div className={styles.notesHeader}>
      <p className={styles.notesLabel}>Notes</p>
      <span className={`${styles.notesStatus} ${status === "error" ? styles.notesStatusError : ""}`} role="status" aria-live="polite">{statusText}</span>
    </div>
    <textarea
      className={styles.notesTextarea}
      value={note}
      maxLength={CALENDAR_MAX_MONTH_NOTE_LENGTH}
      aria-label={`${month} Notes`}
      onChange={(event) => change(event.target.value)}
      onBlur={() => queueSave(noteRef.current)}
      placeholder="写下这个月想留住的事…"
    />
    <span className={styles.notesCount} aria-hidden="true">{note.length}/{CALENDAR_MAX_MONTH_NOTE_LENGTH}</span>
  </aside>;
}
