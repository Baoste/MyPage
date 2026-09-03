import Link from "next/link";
import styles from "./ArticlePublishButton.module.css";

export function ArticlePublishButton() {
  return (
    <Link
      href="/articles/new"
      className={styles.button}
      aria-label="发表文章"
      title="发表文章"
    >
      <span className={styles.symbol} aria-hidden="true">+</span>
    </Link>
  );
}
