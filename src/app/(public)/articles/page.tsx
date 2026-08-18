import type { Metadata } from "next";
import { ArticleList } from "@/components/public/ArticleList";
import { getAllArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Articles",
  description: "Notes on design, engineering, and building durable digital products.",
};

export default async function ArticlesPage() {
  const articles = await getAllArticles();

  return (
    <div className="container-shell py-16 md:py-24">
      <header className="mb-16 grid gap-8 border-b border-[#cfcbc0] pb-12 md:grid-cols-[1fr_2fr]">
        <p className="eyebrow">Writing & notes</p>
        <div>
          <h1 className="display-type text-6xl md:text-8xl">Articles</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#62635c]">
            Observations from making interfaces, maintaining systems, and paying attention to the details in between.
          </p>
        </div>
      </header>
      <ArticleList articles={articles} />
    </div>
  );
}
