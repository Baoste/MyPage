export const siteConfig = {
  name: "Your Name",
  title: "Portfolio",
  description:
    "A considered collection of product work, writing, and professional experience.",
  email: "hello@example.com",
  github: "https://github.com/your-name",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_US",
} as const;

export const publicNavigation = [
  { label: "Home", href: "/" },
  { label: "Works", href: "/#works" },
  { label: "Articles", href: "/articles" },
  { label: "Resume", href: "/resume" },
] as const;

export const privateNavigation = [
  { label: "Home", href: "/yfxl99" },
  { label: "Photos", href: "/yfxl99/photos" },
  { label: "Food", href: "/yfxl99/food" },
] as const;
