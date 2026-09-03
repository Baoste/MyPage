import Link from "next/link";
import { EmptyState } from "@/components/common/EmptyState";
import { formatDate } from "@/lib/format";
import type { Article } from "@/types";

export function ArticleList({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return (
      <EmptyState
        title="No articles yet."
        message="数据库中还没有已发布的文章。点击右下角的加号开始写作。"
      />
    );
  }

  const grouped = Map.groupBy(articles, (article) =>
    new Date(article.createdAt).getUTCFullYear(),
  );

  return (
    <div className="space-y-16">
      {[...grouped.entries()].map(([year, yearArticles]) => (
        <section key={year} aria-labelledby={`year-${year}`} className="grid gap-6 md:grid-cols-[8rem_1fr]">
          <h2 id={`year-${year}`} className="display-type text-3xl">{year}</h2>
          <div className="border-t border-[#bdb8ac]">
            {yearArticles.map((article) => (
              <article key={article.id} className="grid gap-3 border-b border-[#cfcbc0] py-7 sm:grid-cols-[7rem_1fr_auto] sm:items-start">
                <time dateTime={article.createdAt} className="text-xs text-[#77766e]">
                  {formatDate(article.createdAt, { month: "short", day: "numeric" })}
                </time>
                <div>
                  <h3 className="display-type text-2xl leading-tight">
                    <Link href={`/articles/${article.slug}`} className="decoration-1 underline-offset-4 hover:underline">
                      {article.title}
                    </Link>
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#62635c]">
                    {article.summary}
                  </p>
                </div>
                <span aria-hidden="true" className="hidden pt-1 text-lg sm:block">↗</span>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
