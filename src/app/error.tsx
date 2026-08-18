"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container-shell flex min-h-[70vh] items-center py-20">
      <div className="max-w-xl">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display-type mt-5 text-5xl">This page could not be loaded.</h1>
        <p className="mt-5 text-sm leading-6 text-[#62635c]">The error has been kept private. You can safely try the request again.</p>
        <button type="button" onClick={reset} className="mt-8 border border-[#20221e] px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em]">
          Try again
        </button>
      </div>
    </main>
  );
}
