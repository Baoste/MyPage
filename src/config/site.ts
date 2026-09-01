export const siteConfig = {
  name: "Your Name",
  title: "个人作品集",
  description:
    "这里收录了我在产品、写作与职业经历中的思考和实践。",
  email: "hello@example.com",
  github: "https://github.com/your-name",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "zh_CN",
} as const;

export const publicNavigation = [
  { label: "首页", href: "/" },
  { label: "作品", href: "/#works" },
  { label: "文章", href: "/articles" },
  { label: "简历", href: "/resume" },
  { label: "Tools", href: "/tools" },
] as const;

export const privateNavigation = [
  { label: "Home", href: "/yfxl99" },
  { label: "Photos", href: "/yfxl99/photos" },
  { label: "Food", href: "/yfxl99/food" },
] as const;
