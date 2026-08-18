import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAllArticles, getArticleBySlug } from "@/lib/articles";
import { formatDate } from "@/lib/format";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const articles = await getAllArticles();
  return articles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Article not found" };

  return {
    title: article.title,
    description: article.summary,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.summary,
      publishedTime: article.createdAt,
      modifiedTime: article.updatedAt,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <article className="container-shell py-12 md:py-20">
      <Link href="/articles" className="eyebrow inline-block">← All articles</Link>
      <header className="mx-auto mt-12 max-w-4xl border-b border-[#cfcbc0] pb-12 text-center">
        <p className="eyebrow">{article.tags.join(" · ") || "Notes"}</p>
        <h1 className="display-type text-balance mt-5 text-5xl leading-[0.98] md:text-7xl">
          {article.title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#62635c]">
          {article.summary}
        </p>
        <time dateTime={article.createdAt} className="mt-7 block text-xs text-[#77766e]">
          {formatDate(article.createdAt)}
        </time>
      </header>
      <div className="article-body mx-auto mt-12 max-w-[44rem]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
      </div>
    </article>
  );
}
