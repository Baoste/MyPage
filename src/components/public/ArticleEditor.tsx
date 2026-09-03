"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./ArticleEditor.module.css";

interface MarkdownCommand {
  label: string;
  before: string;
  after?: string;
  placeholder: string;
}

const MARKDOWN_COMMANDS: MarkdownCommand[] = [
  { label: "H2", before: "## ", placeholder: "小标题" },
  { label: "粗体", before: "**", after: "**", placeholder: "重点文字" },
  { label: "斜体", before: "*", after: "*", placeholder: "斜体文字" },
  { label: "链接", before: "[", after: "](https://example.com)", placeholder: "链接文字" },
  { label: "引用", before: "> ", placeholder: "引用内容" },
  { label: "列表", before: "- ", placeholder: "列表项目" },
  { label: "代码", before: "```\n", after: "\n```", placeholder: "code" },
];

function slugFromTitle(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function tagsFromValue(value: string) {
  return [...new Set(
    value
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
  )];
}

export function ArticleEditor() {
  const router = useRouter();
  const markdownRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [summary, setSummary] = useState("");
  const [tagValue, setTagValue] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateTitle(value: string) {
    setTitle(value);
    if (!slugWasEdited) setSlug(slugFromTitle(value));
  }

  function insertMarkdown(command: MarkdownCommand) {
    const textarea = markdownRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || command.placeholder;
    const insertion = `${command.before}${selected}${command.after ?? ""}`;
    const nextContent = `${content.slice(0, start)}${insertion}${content.slice(end)}`;
    setContent(nextContent);

    requestAnimationFrame(() => {
      textarea.focus();
      const selectionStart = start + command.before.length;
      textarea.setSelectionRange(selectionStart, selectionStart + selected.length);
    });
  }

  async function publishArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          summary,
          tags: tagsFromValue(tagValue),
          content,
          password,
        }),
      });
      const result = await response.json() as {
        ok?: boolean;
        message?: string;
        article?: { slug?: string };
      };
      if (!response.ok || !result.article?.slug) {
        throw new Error(result.message || "文章发布失败，请稍后再试。");
      }

      router.push(`/articles/${encodeURIComponent(result.article.slug)}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "文章发布失败，请稍后再试。");
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.composer} onSubmit={publishArticle}>
      <section className={styles.metadataPanel} aria-labelledby="article-basics-heading">
        <h2 id="article-basics-heading" className="sr-only">文章基本信息</h2>

        <label className={styles.field} htmlFor="article-title">
          <span className={styles.label}>标题</span>
          <input
            id="article-title"
            className={styles.input}
            value={title}
            onChange={(event) => updateTitle(event.target.value)}
            maxLength={160}
            required
          />
        </label>

        <label className={styles.field} htmlFor="article-slug">
          <span className={styles.label}>Slug</span>
          <input
            id="article-slug"
            className={styles.input}
            value={slug}
            onChange={(event) => {
              setSlugWasEdited(true);
              setSlug(event.target.value.toLowerCase());
            }}
            onBlur={() => setSlug(slugFromTitle(slug))}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            maxLength={120}
            aria-describedby="article-slug-hint"
            required
          />
          <span id="article-slug-hint" className={styles.hint}>
            用于网址，只能填写小写字母、数字和连字符，例如 rendering-notes。
          </span>
        </label>

        <label className={`${styles.field} ${styles.wideField}`} htmlFor="article-summary">
          <span className={styles.label}>摘要</span>
          <textarea
            id="article-summary"
            className={styles.summary}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            maxLength={500}
            required
          />
        </label>

        <label className={`${styles.field} ${styles.wideField}`} htmlFor="article-tags">
          <span className={styles.label}>标签</span>
          <input
            id="article-tags"
            className={styles.input}
            value={tagValue}
            onChange={(event) => setTagValue(event.target.value)}
            placeholder="AI, 图形学, 随笔"
            aria-describedby="article-tags-hint"
          />
          <span id="article-tags-hint" className={styles.hint}>
            使用中文或英文逗号分隔，最多 12 个标签。
          </span>
        </label>
      </section>

      <section className={styles.workspace} aria-label="Markdown 编辑器">
        <div className={styles.writePane}>
          <div className={styles.paneHeading}>
            <span>Markdown</span>
            <span>Write</span>
          </div>
          <div className={styles.toolbar} role="toolbar" aria-label="Markdown 格式工具">
            {MARKDOWN_COMMANDS.map((command) => (
              <button
                key={command.label}
                type="button"
                className={styles.toolButton}
                onClick={() => insertMarkdown(command)}
                aria-controls="article-content"
              >
                {command.label}
              </button>
            ))}
          </div>
          <label htmlFor="article-content" className="sr-only">Markdown 正文</label>
          <textarea
            ref={markdownRef}
            id="article-content"
            className={styles.markdownInput}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={"# 从这里开始\n\n支持标题、列表、链接、表格、代码块等 Markdown 格式。"}
            maxLength={200_000}
            spellCheck="true"
            required
          />
        </div>

        <div className={styles.previewPane}>
          <div className={styles.paneHeading}>
            <span>Preview</span>
            <span>GFM</span>
          </div>
          {content.trim() ? (
            <div className={`article-body ${styles.previewBody}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <p className={styles.emptyPreview}>正文预览会显示在这里。</p>
          )}
        </div>
      </section>

      <section className={styles.publishPanel} aria-labelledby="publish-heading">
        <div className={`${styles.field} ${styles.passwordField}`}>
          <label id="publish-heading" className={styles.label} htmlFor="article-password">
            发布密码
          </label>
          <input
            id="article-password"
            className={styles.passwordInput}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            maxLength={256}
            autoComplete="current-password"
            required
          />
          <span className={styles.hint}>密码仅发送到本站服务端进行验证。</span>
        </div>

        <button className={styles.publishButton} type="submit" disabled={submitting}>
          {submitting ? "正在发布…" : "发布文章"}
          <span aria-hidden="true">↗</span>
        </button>

        {message ? (
          <p className={`${styles.message} ${styles.errorMessage}`} role="alert">{message}</p>
        ) : null}
      </section>

      <p className={styles.hint}>
        <Link href="/articles">← 取消并返回文章列表</Link>
      </p>
    </form>
  );
}
