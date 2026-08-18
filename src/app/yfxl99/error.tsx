"use client";

export default function PrivateError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container-shell flex min-h-[70vh] items-center py-16">
      <div className="max-w-lg">
        <p className="eyebrow text-[#777067]">Unable to open this memory</p>
        <h1 className="display-type mt-5 text-5xl">Something stayed out of reach.</h1>
        <p className="mt-5 text-sm leading-6 text-[#716a62]">No private details were included in this error. Please try again.</p>
        <button type="button" onClick={reset} className="mt-8 border border-[#302d29] px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em]">Try again</button>
      </div>
    </main>
  );
}
