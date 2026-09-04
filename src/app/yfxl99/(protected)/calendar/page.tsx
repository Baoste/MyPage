import type { Metadata } from "next";
import Link from "next/link";
import { requirePrivateSession } from "@/lib/auth/session";
import type { CalendarMonthDay } from "@/lib/calendar/contracts";
import { getCalendarMonth, getCalendarMonthNote, getLatestCalendarContentMonth } from "@/services/calendarService";
import CalendarExperience from "./CalendarExperience";
import CalendarNotes from "./CalendarNotes";
import styles from "./CalendarPage.module.css";

export const metadata: Metadata = { title: "Calendar" };
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
interface CalendarPageProps { searchParams: Promise<{ month?: string | string[] }> }
function shanghaiToday() { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).split("-").map(Number); return { year: parts[0], month: parts[1], day: parts[2] }; }
function parseMonth(value: string | string[] | undefined, fallback: { year: number; month: number }) { const normalized = Array.isArray(value) ? value[0] : value; const match = normalized?.match(/^(\d{4})-(\d{2})$/u); if (!match) return fallback; const year = Number(match[1]), month = Number(match[2]); return year >= 1000 && year <= 9999 && month >= 1 && month <= 12 ? { year, month } : fallback; }
function shiftMonth({ year, month }: { year: number; month: number }, offset: number) { const index = year * 12 + month - 1 + offset; return { year: Math.floor(index / 12), month: (index % 12) + 1 }; }
function href(value: { year: number; month: number }) { return `/yfxl99/calendar?month=${value.year}-${String(value.month).padStart(2, "0")}`; }

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const session = await requirePrivateSession(); const today = shanghaiToday(); const params = await searchParams;
  const displayed = parseMonth(params.month, today); const monthKey = `${displayed.year}-${String(displayed.month).padStart(2, "0")}`;
  let days: CalendarMonthDay[] = []; let unavailable = ""; let latestContentMonth: string | null = null;
  let monthNote = "留住有照片、有味道的日子。"; let monthNoteError = "";
  try {
    days = await getCalendarMonth(monthKey);
    if (days.length === 0) latestContentMonth = await getLatestCalendarContentMonth();
  } catch (error) { unavailable = error instanceof Error ? error.message : "日历数据暂时不可用。"; }
  try {
    const savedNote = await getCalendarMonthNote(session.userId, monthKey);
    if (savedNote) monthNote = savedNote.content;
  } catch (error) { monthNoteError = error instanceof Error ? error.message : "本月 Notes 暂时不可用。"; }
  const previous = shiftMonth(displayed, -1), next = shiftMonth(displayed, 1), current = displayed.year === today.year && displayed.month === today.month;
  return <section className={styles.page} aria-labelledby="calendar-title"><div className={`container-shell ${styles.workspace}`}>
    <header className={styles.header}><p className={styles.monthIndex} aria-hidden="true">{String(displayed.month).padStart(2, "0")}</p><div className={styles.headerMain}>
      <nav className={styles.monthNavigation} aria-label="月份切换"><Link href={href(previous)} className={styles.monthButton}>← 上个月</Link><Link href="/yfxl99/calendar" className={`${styles.monthButton} ${styles.todayButton}`} aria-current={current ? "date" : undefined}>本月</Link><Link href={href(next)} className={styles.monthButton}>下个月 →</Link></nav>
      <h1 id="calendar-title" className={styles.title}><span>{MONTH_NAMES[displayed.month - 1]}</span><span className={styles.year}>{displayed.year}</span></h1>
    </div></header>
    {unavailable ? <p className={styles.notice}>{unavailable}</p> : days.length === 0 ? <p className={styles.notice}>这个月还没有 Photo、Food 或手账。{latestContentMonth && latestContentMonth !== monthKey ? <> 最近有内容的是 <Link href={`/yfxl99/calendar?month=${latestContentMonth}`}>{latestContentMonth}</Link>。</> : null}</p> : null}<p className={styles.scrollHint}>横向滑动查看完整月份</p>
    <div className={styles.journalLayout}><CalendarNotes key={monthKey} month={monthKey} initialValue={monthNote} initialError={monthNoteError} /><CalendarExperience key={monthKey} year={displayed.year} month={displayed.month} today={today} initialDays={days} /></div>
  </div></section>;
}
