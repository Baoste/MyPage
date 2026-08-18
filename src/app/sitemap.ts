import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getAllArticles } from "@/lib/articles";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllArticles();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "monthly", priority: 1 },
    { url: `${siteConfig.url}/articles`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/resume`, changeFrequency: "monthly", priority: 0.7 },
  ];

  return [
    ...staticRoutes,
    ...articles.map((article) => ({
      url: `${siteConfig.url}/articles/${article.slug}`,
      lastModified: article.updatedAt ?? article.createdAt,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
