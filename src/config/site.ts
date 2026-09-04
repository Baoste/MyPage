export const siteConfig = {
  name: "Yifan Xu",
  avatar: "/profile/avatar.jpg",
  title: "个人作品集",
  description:
    "Hi！我是徐一帆，一名热爱创造的开发者，专注于 @@AI 与游戏开发@@。我曾在快手视频模型组和电信 AI 研究院实习，参与多个 AI 相关项目，积累了扎实的技术实践经验。大学期间，我也主持开发了多款游戏，在游戏设计与制作方面进行了深入探索。我始终对创新技术与设计理念保持热情，喜欢将技术、创意与实际需求结合起来，并致力于把有趣的想法转化为真正可落地的产品与体验。",
  email: "594096787@qq.com",
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
  { label: "Calendar", href: "/yfxl99/calendar" },
] as const;
