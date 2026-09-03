import type { Metadata } from "next";
import { ArticleEditor } from "@/components/public/ArticleEditor";

export const metadata: Metadata = {
  title: "发表文章",
  description: "使用 Markdown 编写并发布文章。",
  robots: { index: false, follow: false },
};

export default function NewArticlePage() {
  return (
    <div className="container-shell py-12 md:py-20">
      <header className="mb-10 grid gap-6 border-b-2 border-black pb-9 md:grid-cols-[1fr_2fr]">
        <p className="eyebrow">Article desk</p>
        <div>
          <h1 className="display-type text-5xl md:text-7xl">Write & publish</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-[#62635c] md:text-base md:leading-7">
            填写文章信息，在 Markdown 编辑区完成正文并确认预览，最后输入发布密码。
          </p>
        </div>
      </header>
      <ArticleEditor />
    </div>
  );
}
