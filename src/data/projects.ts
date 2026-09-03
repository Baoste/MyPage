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
      "基于 CUDA 独立开发轻量级路径追踪渲染器，利用 GPU 并行实现 BVH 构建与遍历、光线求交、路径采样及图像渲染，并集成简易布料物理模拟系统；针对低采样率下的噪声与帧间闪烁，基于 G-Buffer 实现时域重投影、交叉双边滤波与时空融合，在保留几何边缘的同时提升实时渲染质量与帧间稳定性。除 CUDA 外未依赖第三方渲染或物理计算框架。",
    coverFile: [
      ["cuda-path-tracing-0.jpg", "cuda-path-tracing-1.png"],
      "cuda-path-tracing-2.png",
      "cuda-path-tracing-3.jpg"
    ],
    tags: ["图形学", "光线追踪"],
    projectDate: "2025-05 - 2025-07",
    githubUrl: "https://github.com/Baoste/CudaPathTracing",
  },
  {
    id: "game-bust",
    title: "Bust",
    description:
      "这是一款基于 21 点规则进行重新设计的双人 PvP 卡牌游戏，在保留 Blackjack 风险决策与概率博弈特点的基础上，引入卡牌构筑、技能效果与玩家对抗机制，尝试将传统纸牌规则转化为更具策略深度和对抗性的数字卡牌玩法。玩法原型、系统设计、程序实现与特效表现均由个人完成。开发配套 Web 配置后台，支持策划在线创建、组合与调整卡牌效果，并实时同步至游戏，降低新增卡牌及效果迭代的代码成本。",
    coverFile: [
      ["https://www.bilibili.com/video/BV1PEj161Exm", "game-bust-0.png"],
      ["game-bust-1.png", "game-bust-2.png", "game-bust-3.png"],
    ],
    tags: ["独立游戏", "卡牌游戏"],
    projectDate: "2026-03 - 2026-06",
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
  {
    id: "sss-shallow-water",
    title: "次表面散射与浅水模拟",
    description:
      "基于 Unity URP 与 HLSL 实现次表面材质与水体渲染系统；基于浅水波动方程和有限差分法实现可交互水面模拟，并使用 PCG 求解排水修正，结合屏幕空间折射、环境反射与菲涅尔混合完成水体渲染。通过基于深度的雾效与屏幕空间雨滴后处理构建动态天气效果。",
    coverFile: [
      ["sss-shallow-water-0.jpg", "sss-shallow-water-1.png"],
      ["sss-shallow-water-2.jpg", "sss-shallow-water-3.png"]
    ],
    tags: ["图形学", "物理模拟"],
    projectDate: "2025-12 - 2026-01",
  },
  {
    id: "game-throwdowns",
    title: "Throwdowns",
    description:
      "基于 Unity 开发双人本地对战游戏，围绕“投掷武器+ 元素反应”设计核心玩法，实现剑体碰撞、元素组合与战斗反馈等系统；作品获中国传媒大学校内游戏评选最高人气票数。",
    coverFile: [
      "https://www.bilibili.com/video/BV1HnTkzsEyq",
      "game-throwdowns.png"
    ],
    tags: ["独立游戏", "双人本地对战"],
    projectDate: "2025-12 - 2026-01",
  },
]);
