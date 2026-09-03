export const siteConfig = {
  name: "Yifan Xu",
  title: "个人作品集",
  description:
    "Hi！我是徐一帆，一名热衷于创造的开发者，专注于 AI 和游戏开发。曾在快手视频模型组、电信 AI 研究院参与实习，积累了丰富的前端开发、交互体验和 AI 项目经验。我热衷于探索创新的技术和设计理念，致力于将创意转化为实际的产品和体验。",
  email: "hello@example.com",
  github: "https://github.com/Baoste",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "zh_CN",
} as const;

export const publicNavigation = [
  { label: "首页", href: "/" },
  { label: "作品", href: "/#works" },
  { label: "文章", href: "/articles" },
  { label: "简历", href: "/resume" },
  { label: "工具", href: "/tools" },
] as const;

export const privateNavigation = [
  { label: "Home", href: "/yfxl99" },
  { label: "Photos", href: "/yfxl99/photos" },
  { label: "Food", href: "/yfxl99/food" },
] as const;
