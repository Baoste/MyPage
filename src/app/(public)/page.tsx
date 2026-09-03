import Image from "next/image";
import { connection } from "next/server";
import { FeaturedArticles } from "@/components/public/FeaturedArticles";
import { ProfilePortrait } from "@/components/public/ProfilePortrait";
import { ProjectGallery } from "@/components/public/ProjectGallery";
import styles from "@/components/public/PublicSite.module.css";
import { siteConfig } from "@/config/site";
import { parseHighlightMarkers } from "@/lib/highlight-markers";
import { getLatestArticles } from "@/services/articleService";
import { getPublishedProjects } from "@/services/projectService";

const WORKS_TITLE = "Selected works · 精选作品 ·\u00A0";
const ARTICLES_TITLE = "Selected articles · 精选文章 ·\u00A0";
const WORKS_TITLE_REPEAT_COUNT = 6;
const PRIMARY_TOOLS = [
  { name: "C++", icon: "/icons/technologies/cpp.svg" },
  { name: "Python", icon: "/icons/technologies/python.svg" },
  { name: "Unity", icon: "/icons/technologies/unity.svg" },
  { name: "Unreal Engine", icon: "/icons/technologies/unreal-engine.svg" },
] as const;

function renderHighlightedDescription(description: string) {
  return parseHighlightMarkers(description).map((segment, index) => (
    segment.highlighted
      ? (
          <mark key={index} className={styles.heroDescriptionHighlight}>
            {segment.text}
          </mark>
        )
      : segment.text
  ));
}

function MarqueeTitle({ id, label }: { id: string; label: string }) {
  return (
    <header className={styles.worksHeader}>
      <h2 id={id} className={styles.worksTitle} aria-label={label}>
        <span className={styles.worksTitleTrack} aria-hidden="true">
          {[0, 1].map((groupIndex) => (
            <span key={groupIndex} className={styles.worksTitleGroup}>
              {Array.from({ length: WORKS_TITLE_REPEAT_COUNT }, (_, itemIndex) => (
                <span key={itemIndex} className={styles.worksTitleText}>{label}</span>
              ))}
            </span>
          ))}
        </span>
      </h2>
    </header>
  );
}

export default async function HomePage() {
  await connection();
  const projects = getPublishedProjects();
  const articles = await getLatestArticles(6).catch((error) => {
    console.error("Unable to load featured articles on the homepage.", error);
    return [];
  });

  return (
    <>
      <section className={styles.hero} aria-labelledby="home-heading">
        <div className={styles.heroMain}>
          <div>
            <p className={styles.heroKicker}>独立作品集</p>

            <div className={styles.heroIdentity}>
              <h1 id="home-heading" className={styles.heroName}>{siteConfig.name}</h1>
              <ProfilePortrait
                src={siteConfig.avatar}
                alt={`${siteConfig.name} 的头像`}
              />
            </div>

            <div className={styles.heroIntro}>
              <div>
                <p className={styles.heroRole} aria-hidden="true">&nbsp;</p>
                <p className={styles.heroDescription}>
                  {renderHighlightedDescription(siteConfig.description)}
                </p>
              </div>
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
        <MarqueeTitle id="works-heading" label={WORKS_TITLE} />
        <ProjectGallery projects={projects} />
      </section>

      <section
        id="featured-articles"
        aria-labelledby="featured-articles-heading"
        className={styles.featuredArticles}
      >
        <MarqueeTitle id="featured-articles-heading" label={ARTICLES_TITLE} />
        <FeaturedArticles articles={articles} />
      </section>
    </>
  );
}
