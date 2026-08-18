import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-shell flex min-h-[70vh] items-center py-20">
      <div className="max-w-xl">
        <p className="eyebrow">404 · Not found</p>
        <h1 className="display-type mt-5 text-6xl">There is nothing here.</h1>
        <p className="mt-5 text-sm leading-6 text-[#62635c]">The page may have moved, or the address may be incomplete.</p>
        <Link href="/" className="mt-8 inline-block border-b border-[#20221e] pb-1 text-xs font-semibold uppercase tracking-[0.1em]">Return home</Link>
      </div>
    </main>
  );
}
