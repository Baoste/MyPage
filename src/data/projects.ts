import { defineProjects } from "@/lib/project/catalog";

/**
 * Homepage Works catalog.
 *
 * - Array order is display order.
 * - Omit `published` or set it to `true` to show an item.
 * - Set `published: false` to keep a draft in code without displaying it.
 * - `coverFile` is only the filename inside PROJECT_COVER_STORAGE_ROOT/projects/.
 */
export const projects = defineProjects([
  {
    id: "editorial-system",
    title: "内容编辑系统",
    description:
      "以清晰的信息层级和舒适的阅读体验为核心，打造从容的内容发布流程。",
    tags: ["产品设计", "前端开发"],
    projectDate: "2026-05-01",
  },
  {
    id: "archive-tool",
    title: "个人档案库",
    description:
      "为容易散落的笔记和图片提供一个私密、可搜索的归档空间。",
    tags: ["Next.js", "Supabase"],
    projectDate: "2026-02-01",
  },
  {
    id: "quiet-interface",
    title: "克制的界面研究",
    description:
      "探索克制的动效、恰到好处的留白，以及经得起时间考验的界面模式。",
    tags: ["界面设计", "设计研究"],
    projectDate: "2025-11-01",
  },
]);
