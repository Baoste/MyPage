"use client";

import { FOOD_TIMEZONE } from "@/lib/food/contracts";
import type { FoodRankingItem, FoodStatistics } from "@/types";

function Ranking({ title, items }: { title: string; items: FoodRankingItem[] }) {
  return (
    <section>
      <h3 className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[#777067]">{title}</h3>
      {items.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.key}>
              <div className="flex items-baseline justify-between gap-4 text-xs">
                <span className="truncate text-[#423d37]">{item.label}</span>
                <span className="shrink-0 tabular-nums text-[#777067]">{item.count} · {item.percentage}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#ddd5c9]" aria-hidden="true">
                <div className="h-full rounded-full bg-[#8f4d34]" style={{ width: `${item.percentage}%` }} />
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="mt-4 text-xs text-[#81796f]">还没有足够记录。</p>}
    </section>
  );
}

export function FoodStatsPanel({ statistics }: { statistics: FoodStatistics }) {
  const maximumMonth = Math.max(1, ...statistics.monthlyTimeline.map((item) => item.count));
  const firstDate = statistics.firstRecordedAt
    ? new Intl.DateTimeFormat("zh-CN", { timeZone: FOOD_TIMEZONE, year: "numeric", month: "long", day: "numeric" }).format(new Date(statistics.firstRecordedAt))
    : null;

  return (
    <section id="food-statistics-region" aria-labelledby="food-stats-title" className="rounded-[1.75rem] border border-[#d4ccbf] bg-[#eee8de] px-5 py-8 shadow-[0_14px_42px_rgba(55,47,38,0.08)] sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Our shared table</p>
          <h2 id="food-stats-title" className="display-type mt-2 text-4xl sm:text-5xl">一起吃过的日子</h2>
        </div>
        {firstDate ? (
          <p className="max-w-xs text-right text-xs leading-5 text-[#70685f]">
            第一条记录是 {firstDate}，距今 {statistics.daysSinceFirst ?? 0} 天。
          </p>
        ) : null}
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["记录", statistics.groupCount],
          ["照片", statistics.imageCount],
          ["分类", statistics.uniqueCategoryCount],
          ["国家", statistics.countryCount],
          ["城市", statistics.cityCount],
          ["平均评分", statistics.averageRating === null ? "—" : `${statistics.averageRating}★`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-[#f7f3ec] px-4 py-5 text-center">
            <dt className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#81786f]">{label}</dt>
            <dd className="display-type mt-2 text-3xl text-[#37322d]">{value}</dd>
          </div>
        ))}
      </dl>

      {statistics.groupCount > 0 ? (
        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          <Ranking title="分类排行" items={statistics.categoryRanking.slice(0, 6)} />
          <Ranking title="城市排行" items={statistics.cityRanking.slice(0, 6)} />
          <Ranking title="评分分布" items={statistics.ratingDistribution} />
        </div>
      ) : (
        <p className="mt-10 text-sm text-[#756d64]">还没有足够记录，上传第一组图片后这里会开始积累。</p>
      )}

      {statistics.groupCount > 0 ? (
        <section className="mt-10 border-t border-[#c9c0b4] pt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[#777067]">最近十二个月</h3>
            <p className="text-xs text-[#777067]">最近一年新增 {statistics.recentYearGroupCount} 组 · {statistics.recentYearImageCount} 张照片 · 五星 {statistics.fiveStarCount} 次</p>
          </div>
          <div className="mt-5 grid h-36 grid-cols-12 items-end gap-1" role="img" aria-label={`最近十二个月共记录 ${statistics.monthlyTimeline.reduce((total, item) => total + item.count, 0)} 组美食`}>
            {statistics.monthlyTimeline.map((item) => (
              <div key={item.key} className="flex h-full min-w-0 flex-col justify-end gap-2 text-center">
                <span className="text-[0.58rem] tabular-nums text-[#756d64]">{item.count || ""}</span>
                <span className="block min-h-1 rounded-t-full bg-[#9b5b40]" style={{ height: `${Math.max(4, (item.count / maximumMonth) * 88)}px` }} aria-hidden="true" />
                <span className="truncate text-[0.5rem] text-[#81796f]">{item.label.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {statistics.todayMemories.length > 0 ? (
        <section className="mt-10 border-t border-[#c9c0b4] pt-8">
          <h3 className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[#777067]">往年今日</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {statistics.todayMemories.map((memory) => (
              <li key={memory.id} className="rounded-2xl border border-[#d4ccbf] bg-[#f7f3ec] p-4 text-sm">
                <p className="display-type text-2xl">{memory.category}</p>
                <p className="mt-2 text-xs text-[#756d64]">{memory.cityName} · {new Intl.DateTimeFormat("zh-CN", { timeZone: FOOD_TIMEZONE, year: "numeric", month: "long", day: "numeric" }).format(new Date(memory.occurredAt))}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
