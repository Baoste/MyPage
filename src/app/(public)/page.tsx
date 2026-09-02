import Link from "next/link";
import { GeometricPortrait } from "@/components/public/GeometricPortrait";
import { ProjectGallery } from "@/components/public/ProjectGallery";
import styles from "@/components/public/PublicSite.module.css";
import { siteConfig } from "@/config/site";
import { getPublishedProjects } from "@/services/projectService";

export const revalidate = 300;

export default async function HomePage() {
  const projects = await getPublishedProjects();

  return (
    <>
      <section className={styles.hero} aria-labelledby="home-heading">
        <div className={styles.heroMain}>
          <div>
            <p className={styles.heroKicker}>独立作品集 · 2026</p>
            <h1 id="home-heading" className={styles.heroName}>{siteConfig.name}</h1>

            <div className={styles.heroIntro}>
              <div>
                <p className={styles.heroRole}>Creative developer</p>
                <p className={styles.heroDescription}>{siteConfig.description}</p>
                <ul className={styles.skillList} aria-label="工作方向">
                  {['产品设计', '前端开发', '内容系统', '交互体验'].map((skill) => (
                    <li key={skill} className={styles.skillPill}>{skill}</li>
                  ))}
                </ul>
              </div>
              <GeometricPortrait />
            </div>
          </div>

          <ul className={styles.toolRow} aria-label="主要技术">
            {['Next.js', 'TypeScript', 'Supabase', 'React'].map((tool, index) => (
              <li key={tool} className={styles.toolItem}>
                <span className={styles.toolMark} aria-hidden="true"><span>{index + 1}</span></span>
                {tool}
              </li>
            ))}
          </ul>
        </div>

        <aside className={styles.heroRail} aria-label="个人方向与色彩标识">
          <div className={styles.railStatement}>
            <span className={styles.railArrow} aria-hidden="true">→</span>
            <p className={styles.railRoles}>
              Creative<br />
              Technologist<br />
              Designer<br />
              Developer
            </p>
          </div>
          <div className={styles.colorGrid} aria-hidden="true">
            <span className={styles.redBlock} />
            <span className={styles.whiteBlock} />
            <span className={styles.blueBlock} />
            <span className={styles.yellowBlock} />
          </div>
        </aside>
      </section>

      <section id="works" aria-labelledby="works-heading" className={styles.works}>
        <header className={styles.worksHeader}>
          <h2 id="works-heading" className={styles.worksTitle}>Selected works / 精选作品</h2>
          <Link href="/articles" className={styles.worksCount}>
            {String(projects.length).padStart(2, '0')} Projects&nbsp; ↗
          </Link>
        </header>
        <ProjectGallery projects={projects} />
      </section>
    </>
  );
}
