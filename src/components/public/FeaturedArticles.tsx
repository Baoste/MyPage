import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { Article } from "@/types";
import styles from "./PublicSite.module.css";

export function FeaturedArticles({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return (
      <div className={styles.featuredArticlesEmpty}>
        <p>文章数据库中还没有可展示的内容。</p>
        <Link href="/articles">前往文章页 <span aria-hidden="true">↗</span></Link>
      </div>
    );
  }

  return (
    <>
      <div className={styles.featuredArticleGrid}>
      {articles.map((article) => {
        const visibleTags = article.tags.slice(0, 3);
        const hiddenTagCount = article.tags.length - visibleTags.length;
        return (
          <article key={article.id} className={styles.featuredArticleCard}>
            <Link
              href={`/articles/${article.slug}`}
              className={styles.featuredArticleLink}
              aria-label={`阅读文章：${article.title}`}
            >
              <div className={styles.featuredArticleCover}>
                {article.coverUrl ? (
                  <Image
                    className={styles.featuredArticleCoverImage}
                    src={article.coverUrl}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 34vw, (max-width: 1100px) 17vw, 12rem"
                  />
                ) : (
                  <div className={styles.featuredArticleFallback} aria-hidden="true">
                    <span>Article</span>
                    <strong>{new Date(article.createdAt).getUTCFullYear()}</strong>
                  </div>
                )}
              </div>

              <div className={styles.featuredArticleInfo}>
                <div className={styles.featuredArticleMeta}>
                  <time dateTime={article.createdAt}>{formatDate(article.createdAt)}</time>
                  <span aria-hidden="true">↗</span>
                </div>
                <h3>{article.title}</h3>
                <ul className={styles.featuredArticleTags} aria-label="文章标签">
                  {(visibleTags.length ? visibleTags : ["Notes"]).map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                  {hiddenTagCount > 0 ? <li>+{hiddenTagCount}</li> : null}
                </ul>
              </div>
            </Link>
          </article>
        );
      })}
      </div>
      <div className={styles.featuredArticlesFooter}>
        <Link href="/articles" className={styles.featuredArticlesViewAll}>
          View all <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </>
  );
}
