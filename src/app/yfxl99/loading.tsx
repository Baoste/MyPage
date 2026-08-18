export default function PrivateLoading() {
  return (
    <div className="container-shell py-20" role="status" aria-live="polite">
      <p className="eyebrow text-[#777067]">Gathering moments</p>
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((item) => <div key={item} className="aspect-[4/3] animate-pulse bg-[#e1d9ce]" />)}
      </div>
      <span className="sr-only">Loading private content</span>
    </div>
  );
}
