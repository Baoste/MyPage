import { defineProjects } from "@/lib/project/catalog";

/**
 * Homepage Works catalog.
 *
 * - Array order is display order.
 * - Omit `published` or set it to `true` to show an item.
 * - Set `published: false` to keep a draft in code without displaying it.
 * - `coverFile` accepts one item or an ordered gallery list. Top-level items
 *   stack vertically; items inside one nested list form a justified row.
 * - Each media item is either an image filename inside
 *   PROJECT_COVER_STORAGE_ROOT/projects/ or one full Bilibili video URL.
 * - `projectDate` uses `YYYY-MM - YYYY-MM`.
 */
export const projects = defineProjects([
  {
    id: "cuda-path-tracing",
    title: "CUDA Path Tracing",
    description:
      "一个自制的光线追踪渲染器，使用 CUDA 进行 GPU 加速，支持多种材质和光照模型。",
    coverFile: [
      ["cuda-path-tracing-0.jpg", "cuda-path-tracing-1.png"],
      "cuda-path-tracing-2.png",
      "cuda-path-tracing-3.jpg"
    ],
    tags: ["图形学", "光线追踪"],
    projectDate: "2025-06 - 2025-09",
    githubUrl: "https://github.com/Baoste/CudaPathTracing",
  },
  {
    id: "game-bust",
    title: "Bust",
    description:
      "一个独立开发的卡牌游戏，探索了创新的游戏机制和策略深度。",
    coverFile: [
      ["https://www.bilibili.com/video/BV1PEj161Exm", "bust-0.png"],
      ["bust-1.png", "bust-2.png", "bust-3.png"],
    ],
    tags: ["独立游戏", "卡牌游戏"],
    projectDate: "2026-02 - 2026-06",
  },
  {
    id: "gallery-bust",
    title: "参展反馈",
    description:
      "我们的游戏在展会上获得了积极的反馈，玩家们对游戏机制和艺术风格表示了高度赞赏。",
    coverFile: [
      ["gallery-bust-0.jpg", "gallery-bust-1.jpg"],
      ["gallery-bust-2.png", "gallery-bust-3.png", "gallery-bust-4.png"]
    ],
    tags: ["展会", "玩家反馈"],
    projectDate: "2026-06 - 2026-08",
  },
]);
