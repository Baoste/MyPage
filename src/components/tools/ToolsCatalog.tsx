import Link from "next/link";
import type { ToolModuleSummary } from "@/lib/tools/module-store";

export function ToolsCatalog({ modules }: { modules: ToolModuleSummary[] }) {
  return (
    <div className="container-shell py-14 md:py-20">
      <header className="grid gap-8 border-b border-[#bfc3ba] pb-10 md:grid-cols-[0.75fr_1.25fr] md:items-end md:pb-14">
        <div className="flex items-start justify-between">
          <p className="eyebrow text-[#526467]">Tools · 工具目录</p>
          <span className="font-mono text-xs text-[#687674]" aria-hidden="true">
            {String(modules.length).padStart(2, "0")} / INDEX
          </span>
        </div>
        <div>
          <h1 className="display-type text-balance text-[clamp(3.5rem,8vw,7rem)] leading-[0.88]">
            把好用的工具，<br />放在手边。
          </h1>
          <p className="mt-7 max-w-xl border-l-2 border-[#315b60] pl-4 text-sm leading-6 text-[#5d635e]">
            每个模块独立保存代码和数据。选择一张工具卡，进入它自己的工作页面。
          </p>
        </div>
      </header>

      <section aria-labelledby="tool-list-heading" className="py-12 md:py-16">
        <div className="mb-7 flex items-end justify-between gap-6">
          <h2 id="tool-list-heading" className="text-sm font-semibold tracking-[0.08em]">可用模块</h2>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[#737a74]">Select a card to open</p>
        </div>

        {modules.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <Link
                key={module.id}
                href={module.href}
                className="group relative isolate min-h-[20rem] overflow-hidden border border-[#bfc4ba] bg-[#ebece4] p-6 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-[#315b60] motion-reduce:transition-none md:p-8"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 opacity-45 [background-image:linear-gradient(#89938a22_1px,transparent_1px),linear-gradient(90deg,#89938a22_1px,transparent_1px)] [background-size:24px_24px]"
                />
                <span aria-hidden="true" className="absolute right-6 top-6 size-9 rounded-full border border-[#6c7d78] before:absolute before:left-1/2 before:top-[-0.4rem] before:h-[3.25rem] before:w-px before:-translate-x-1/2 before:bg-[#6c7d78] after:absolute after:left-[-0.4rem] after:top-1/2 after:h-px after:w-[3.25rem] after:-translate-y-1/2 after:bg-[#6c7d78]" />

                <div className="flex h-full flex-col justify-between">
                  <div>
                    <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-[#315b60]">
                      {module.category}
                    </p>
                    <h3 className="display-type mt-12 max-w-[16rem] text-[2.2rem] leading-[0.95]">
                      {module.title}
                    </h3>
                    <p className="mt-5 max-w-sm text-sm leading-6 text-[#5d635e]">{module.description}</p>
                  </div>

                  <div className="mt-10 flex items-end justify-between gap-6 border-t border-[#aeb6ac] pt-5">
                    <div>
                      <span className="block text-[0.62rem] uppercase tracking-[0.14em] text-[#747b75]">署名</span>
                      <span className="mt-1 block text-sm font-semibold tracking-[0.06em]">{module.author}</span>
                    </div>
                    <span className="grid size-10 place-items-center border border-[#315b60] text-lg text-[#315b60] transition-colors duration-200 group-hover:bg-[#315b60] group-hover:text-[#f4f1e9] motion-reduce:transition-none" aria-hidden="true">↗</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center border border-dashed border-[#bfc4ba] px-6 text-center">
            <div>
              <p className="display-type text-3xl">暂时没有可用工具</p>
              <p className="mt-3 text-sm text-[#696a62]">添加新的独立模块后，它会出现在这里。</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
