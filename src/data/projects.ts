import { defineProjects } from "@/lib/project/catalog";

/**
 * Homepage Works catalog.
 *
 * - Array order is display order.
 * - Omit `published` or set it to `true` to show an item.
 * - Set `published: false` to keep a draft in code without displaying it.
 * - `coverFile` accepts one filename, an image filename list inside
 *   PROJECT_COVER_STORAGE_ROOT/projects/, or one full Bilibili video URL.
 * - `projectDate` uses `YYYY-MM - YYYY-MM`.
 */
export const projects = defineProjects([
  {
    id: "cuda-path-tracing",
    title: "CUDA Path Tracing",
    description:
      "一个自制的光线追踪渲染器，使用 CUDA 进行 GPU 加速，支持多种材质和光照模型。",
    coverFile: "cuda-path-tracing.jpg",
    tags: ["图形学", "光线追踪"],
    projectDate: "2025-06 - 2025-09",
    githubUrl: "https://github.com/Baoste/CudaPathTracing",
  },
  {
    id: "game-bust",
    title: "Bust",
    description:
      "一个独立开发的卡牌游戏，探索了创新的游戏机制和策略深度。",
    coverFile: "https://www.bilibili.com/video/BV1PEj161Exm",
    tags: ["独立游戏", "卡牌游戏"],
    projectDate: "2026-02 - 2026-06",
  },
  {
    id: "quiet-interface",
    title: "克制的界面研究",
    description:
      "探索克制的动效、恰到好处的留白，以及经得起时间考验的界面模式。",
    tags: ["界面设计", "设计研究"],
    projectDate: "2025-11 - 2025-11",
  },
]);
