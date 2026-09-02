import Link from "next/link";
import styles from "@/components/public/PublicSite.module.css";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className={`${styles.footer} print-hidden`}>
      <div className={styles.footerTop}>
        <section className={styles.footerPanel} aria-labelledby="footer-about">
          <h2 id="footer-about" className={styles.footerHeading}>About this site</h2>
          <p className={styles.footerCopy}>记录产品、界面和长期维护中的实践，让复杂的事情变得清晰一点。</p>
          <Link href="/resume" className={styles.footerAction}>更多关于我 <span aria-hidden="true">↗</span></Link>
        </section>
        <section className={styles.footerPanel} aria-labelledby="footer-connect">
          <h2 id="footer-connect" className={styles.footerHeading}>Let&apos;s connect</h2>
          <p className={styles.footerCopy}>欢迎交流有趣的产品、设计与工程问题。</p>
          {siteConfig.email ? (
            <Link href={`mailto:${siteConfig.email}`} className={styles.footerAction}>发送邮件 <span aria-hidden="true">↗</span></Link>
          ) : null}
        </section>
        <div className={styles.footerBlocks} aria-hidden="true"><span /><span /></div>
      </div>

      <div className={styles.footerBottom}>
        <p>© {new Date().getFullYear()} {siteConfig.name}</p>
        <div className={styles.footerLinks}>
          {siteConfig.github ? <Link href={siteConfig.github} target="_blank" rel="noreferrer">GitHub</Link> : null}
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">京ICP备2026056138号</a>
          <Link href="#top" aria-label="返回页面顶部">↑</Link>
        </div>
      </div>
    </footer>
  );
}
