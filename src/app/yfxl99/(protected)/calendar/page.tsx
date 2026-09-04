import type { Metadata } from "next";
import Link from "next/link";
import styles from "./CalendarPage.module.css";

export const metadata: Metadata = {
  title: "Calendar",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface CalendarMonth {
  year: number;
  month: number;
}

interface CalendarPageProps {
  searchParams: Promise<{ month?: string | string[] }>;
}

function getShanghaiDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);

  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
  };
}

function parseMonth(value: string | string[] | undefined, fallback: CalendarMonth) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const match = normalized?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return fallback;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1000 || year > 9999 || month < 1 || month > 12) return fallback;

  return { year, month };
}

function shiftMonth({ year, month }: CalendarMonth, offset: number): CalendarMonth {
  const monthIndex = year * 12 + month - 1 + offset;
  return {
    year: Math.floor(monthIndex / 12),
    month: (monthIndex % 12) + 1,
  };
}

function monthHref({ year, month }: CalendarMonth) {
  return `/yfxl99/calendar?month=${year}-${String(month).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const today = getShanghaiDate();
  const { month: requestedMonth } = await searchParams;
  const displayedMonth = parseMonth(requestedMonth, today);
  const { year, month } = displayedMonth;
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const previousMonth = shiftMonth(displayedMonth, -1);
  const nextMonth = shiftMonth(displayedMonth, 1);
  const isCurrentMonth = year === today.year && month === today.month;

  const weeks = Array.from({ length: cellCount / 7 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, weekdayIndex) => {
      const day = weekIndex * 7 + weekdayIndex - firstWeekday + 1;
      return day >= 1 && day <= daysInMonth ? day : null;
    }),
  );

  return (
    <section className={styles.page} aria-labelledby="calendar-title">
      <div className={`container-shell ${styles.workspace}`}>
        <header className={styles.header}>
          <p className={styles.monthIndex} aria-hidden="true">
            {String(month).padStart(2, "0")}
          </p>

          <div className={styles.headerMain}>
            <nav className={styles.monthNavigation} aria-label="月份切换">
              <Link
                href={monthHref(previousMonth)}
                className={styles.monthButton}
                aria-label={`查看 ${previousMonth.year} 年 ${previousMonth.month} 月`}
              >
                <span aria-hidden="true">←</span>
                <span>上个月</span>
              </Link>
              <Link
                href="/yfxl99/calendar"
                className={`${styles.monthButton} ${styles.todayButton}`}
                aria-current={isCurrentMonth ? "date" : undefined}
              >
                本月
              </Link>
              <Link
                href={monthHref(nextMonth)}
                className={styles.monthButton}
                aria-label={`查看 ${nextMonth.year} 年 ${nextMonth.month} 月`}
              >
                <span>下个月</span>
                <span aria-hidden="true">→</span>
              </Link>
            </nav>

            <h1 id="calendar-title" className={styles.title}>
              <span>{MONTH_NAMES[month - 1]}</span>
              <span className={styles.year}>{year}</span>
            </h1>
          </div>
        </header>

        <p className={styles.scrollHint}>横向滑动查看完整月份</p>

        <div className={styles.journalLayout}>
          <aside className={styles.notesPanel} aria-label="本月手账留白">
            <p className={styles.notesLabel}>Notes</p>
            <div className={styles.notesLines} aria-hidden="true" />
          </aside>

          <div className={styles.calendarScroll}>
            <table className={styles.calendar}>
              <caption className="sr-only">
                {year} 年 {month} 月月历
              </caption>
              <thead>
                <tr>
                  {WEEKDAYS.map((weekday) => (
                    <th key={weekday} scope="col">
                      {weekday}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, weekIndex) => (
                  <tr key={`${year}-${month}-week-${weekIndex}`}>
                    {week.map((day, weekdayIndex) => {
                      if (day === null) {
                        return (
                          <td
                            key={`empty-${weekIndex}-${weekdayIndex}`}
                            className={styles.emptyDay}
                            aria-hidden="true"
                          />
                        );
                      }

                      const isToday = isCurrentMonth && day === today.day;
                      const dateTime = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                      return (
                        <td
                          key={day}
                          className={isToday ? styles.today : undefined}
                          aria-label={`${year} 年 ${month} 月 ${day} 日${isToday ? "，今天" : ""}`}
                        >
                          <time dateTime={dateTime} className={styles.dayNumber}>
                            {day}
                          </time>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
