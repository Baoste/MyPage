import { EmptyState } from "@/components/common/EmptyState";
import { SafeImage } from "@/components/common/SafeImage";
import { formatDate } from "@/lib/format";
import type { FoodViewModel } from "@/types";

export function FoodGrid({ entries }: { entries: FoodViewModel[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No food entries yet."
        message="Meals and small discoveries will gather here over time."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <article key={entry.id} className="group min-w-0">
          <SafeImage
            src={entry.imageUrl}
            alt={entry.name}
            sizes="(min-width: 1024px) 30vw, (min-width: 768px) 46vw, 100vw"
          />
          <div className="border-t border-[#cec5b8] pt-4">
            <div className="flex items-start justify-between gap-4">
              <h2 className="display-type text-2xl">{entry.name}</h2>
              {entry.rating ? (
                <span aria-label={`${entry.rating} out of 5`} className="shrink-0 text-sm tracking-[0.08em] text-[#a64b2a]">
                  {"●".repeat(entry.rating)}<span aria-hidden="true" className="text-[#d0c7bb]">{"●".repeat(5 - entry.rating)}</span>
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-[#777067]">
              {[entry.restaurant, entry.location, formatDate(entry.date)].filter(Boolean).join(" · ")}
            </p>
            {entry.description ? <p className="mt-3 text-sm leading-6 text-[#625c55]">{entry.description}</p> : null}
            {entry.tags.length ? <p className="mt-3 text-[0.66rem] uppercase tracking-[0.12em] text-[#827a71]">{entry.tags.join(" · ")}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
