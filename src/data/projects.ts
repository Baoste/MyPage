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
      "本项目旨在实现一个高效、简洁的路径追踪渲染器，作为图形学实验的一部分，用于深入理解全局光照算法的原理与实现细节。渲染器完全基于 CUDA 开发，利用 GPU 加速光线追踪与采样，提升渲染效率。项目整体架构保持极简，仅依赖标准 C++ 库、tinyobjloader 进行模型加载，以及 ImGui 实现基本交互界面。除 OpenGL 用于将渲染结果输出至屏幕外，未引入任何第三方图形/计算 API，以最大限度保证核心算法的可控性与可理解性，便于学习与扩展。",
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
      "这是一款基于 21 点规则进行重新设计的双人 PvP 卡牌游戏，在保留 Blackjack 风险决策与概率博弈特点的基础上，引入卡牌构筑、技能效果与玩家对抗机制，尝试将传统纸牌规则转化为更具策略深度和对抗性的数字卡牌玩法。玩法原型、系统设计、程序实现与特效表现均由个人完成。",
    coverFile: [
      ["https://www.bilibili.com/video/BV1PEj161Exm", "game-bust-0.png"],
      ["game-bust-1.png", "game-bust-2.png", "game-bust-3.png"],
    ],
    tags: ["独立游戏", "卡牌游戏"],
    projectDate: "2026-02 - 2026-06",
  },
  {
    id: "gallery-bust",
    title: "参展反馈",
    description:
      "展会期间，我们的游戏吸引了约百名玩家现场试玩，并收获了大量积极反馈，玩家们对核心玩法、游戏机制以及整体艺术风格给予了高度评价。知名游戏UP主「逍遥散人」也在现场体验了我们的游戏，进一步提升了项目的关注度。与此同时，我们为本次展会特别设计并制作了一系列游戏主题周边，现场反响热烈，最终全部售罄。",
    coverFile: [
      ["gallery-bust-0.jpg", "gallery-bust-1.jpg"],
      ["gallery-bust-2.png", "gallery-bust-3.png", "gallery-bust-4.png"]
    ],
    tags: ["现场试玩", "玩家反馈", "周边设计"],
    projectDate: "2026-06 - 2026-06",
  },
]);
