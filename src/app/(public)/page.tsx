import Image from "next/image";
import { ProfilePortrait } from "@/components/public/ProfilePortrait";
import { ProjectGallery } from "@/components/public/ProjectGallery";
import styles from "@/components/public/PublicSite.module.css";
import { siteConfig } from "@/config/site";
import { getPublishedProjects } from "@/services/projectService";

const WORKS_TITLE = "Selected works · 精选作品 ·\u00A0";
const WORKS_TITLE_REPEAT_COUNT = 6;
const PRIMARY_TOOLS = [
  { name: "C++", icon: "/icons/technologies/cpp.svg" },
  { name: "Python", icon: "/icons/technologies/python.svg" },
  { name: "Unity", icon: "/icons/technologies/unity.svg" },
  { name: "Unreal Engine", icon: "/icons/technologies/unreal-engine.svg" },
] as const;

export default function HomePage() {
  const projects = getPublishedProjects();

  return (
    <>
      <section className={styles.hero} aria-labelledby="home-heading">
        <div className={styles.heroMain}>
          <div>
            <p className={styles.heroKicker}>独立作品集</p>
            <h1 id="home-heading" className={styles.heroName}>{siteConfig.name}</h1>

            <div className={styles.heroIntro}>
              <div>
                <p className={styles.heroRole}>Creative developer</p>
                <p className={styles.heroDescription}>{siteConfig.description}</p>
              </div>
              <ProfilePortrait
                src={siteConfig.avatar}
                alt={`${siteConfig.name} 的头像`}
              />
            </div>
          </div>

          <ul className={styles.toolRow} aria-label="主要技术">
            {PRIMARY_TOOLS.map((tool) => (
              <li key={tool.name} className={styles.toolItem}>
                <Image
                  className={styles.toolIcon}
                  src={tool.icon}
                  alt=""
                  width={28}
                  height={28}
                  aria-hidden="true"
                />
                {tool.name}
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
          <h2
            id="works-heading"
            className={styles.worksTitle}
            aria-label={WORKS_TITLE}
          >
            <span className={styles.worksTitleTrack} aria-hidden="true">
              {[0, 1].map((groupIndex) => (
                <span key={groupIndex} className={styles.worksTitleGroup}>
                  {Array.from({ length: WORKS_TITLE_REPEAT_COUNT }, (_, itemIndex) => (
                    <span key={itemIndex} className={styles.worksTitleText}>
                      {WORKS_TITLE}
                    </span>
                  ))}
                </span>
              ))}
            </span>
          </h2>
          {/* <Link href="/articles" className={styles.worksCount}>
            {String(projects.length).padStart(2, '0')} Projects&nbsp; ↗
          </Link> */}
        </header>
        <ProjectGallery projects={projects} />
      </section>
    </>
  );
}
