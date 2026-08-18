import { EmptyState } from "@/components/common/EmptyState";
import { SafeImage } from "@/components/common/SafeImage";
import { formatDate } from "@/lib/format";
import type { PhotoViewModel } from "@/types";

export function PhotoGallery({ photos }: { photos: PhotoViewModel[] }) {
  if (photos.length === 0) {
    return (
      <EmptyState
        title="No photos yet."
        message="When a photo is added in Supabase, it will appear here quietly."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <article key={photo.id} className="group min-w-0">
          <SafeImage
            src={photo.imageUrl}
            alt={photo.title ?? `Photo from ${formatDate(photo.date)}`}
            sizes="(min-width: 1024px) 30vw, (min-width: 768px) 46vw, 100vw"
            ratio="portrait"
          />
          <div className="border-t border-[#cec5b8] pt-4">
            <div className="flex items-start justify-between gap-4">
              <h2 className="display-type text-2xl">{photo.title ?? "Untitled moment"}</h2>
              <time dateTime={photo.date} className="shrink-0 text-[0.68rem] uppercase tracking-[0.1em] text-[#777067]">
                {formatDate(photo.date, { month: "short", day: "numeric" })}
              </time>
            </div>
            {photo.location ? <p className="mt-2 text-xs text-[#777067]">{photo.location}</p> : null}
            {photo.description ? <p className="mt-3 text-sm leading-6 text-[#625c55]">{photo.description}</p> : null}
            {photo.tags.length ? <p className="mt-3 text-[0.66rem] uppercase tracking-[0.12em] text-[#827a71]">{photo.tags.join(" · ")}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
