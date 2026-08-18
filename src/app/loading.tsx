export default function Loading() {
  return (
    <div className="container-shell py-24" role="status" aria-live="polite">
      <p className="eyebrow">Loading</p>
      <div className="mt-8 h-px w-full animate-pulse bg-[#bdb8ac]" />
      <span className="sr-only">Loading page content</span>
    </div>
  );
}
