# 个人网站开发需求

你是一名资深 **全栈工程师 + 前端工程师 + 前端设计师**。

请根据以下需求，从零实现一个完整、可运行、可部署、易维护的个人网站。

本项目是一个长期维护的个人网站，因此重点不是快速堆砌 Demo，而是建立：

> **结构清晰、视觉简洁、代码规范、安全可靠、方便后续扩展的现代 Web 项目。**

请严格遵循本需求，不要擅自增加大量当前不需要的功能。

---

# 1. 项目目标

网站分为两个区域：

```text
个人网站
│
├── Public 公开区域
│   ├── Home / Works
│   ├── Articles
│   └── Resume
│
└── Private 私密区域
    └── /yfxl99
        ├── Login / Welcome
        ├── Photos
        └── Food
```

公开区域用于：

```text
个人介绍
作品展示
文章
简历
```

私密区域用于：

```text
恋爱日记
日常照片
美食记录
未来其他私人内容
```

---

# 2. 技术栈

统一使用：

```text
Framework:
Next.js

Language:
TypeScript

Frontend:
React

CSS:
Tailwind CSS

Database:
Supabase PostgreSQL（仅 Private 业务数据）

Object Storage:
服务器本地持久磁盘 + Supabase Storage 旧媒体兼容

Supabase SDK:
@supabase/supabase-js
```

优先使用当前稳定版本。

使用 Next.js App Router。

---

# 3. 基本工程要求

代码必须：

- 使用 TypeScript。
- 使用 React Function Component。
- 使用现代 Next.js App Router。
- 合理区分 Server Component 和 Client Component。
- 默认优先 Server Component。
- 只有确实需要浏览器交互时才使用 `"use client"`。
- 组件职责单一。
- 避免超大组件。
- 数据访问逻辑与 UI 分离。
- 公共逻辑抽离。
- 类型定义清晰。
- 禁止随意使用 `any`。
- 避免重复代码。
- 不要把所有代码写在单个文件。
- 不要把大量数据硬编码在 JSX 中。
- 敏感信息不得进入 Client Bundle。
- 保证项目可以正常执行 Production Build。

---

# 4. 推荐目录结构

可以根据实际实现调整，但整体职责必须保持清晰。

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   │
│   ├── articles/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   │
│   ├── resume/
│   │   └── page.tsx
│   │
│   ├── yfxl99/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── photos/
│   │   │   └── page.tsx
│   │   └── food/
│   │       └── page.tsx
│   │
│   ├── api/
│   │   └── private/
│   │       ├── login/
│   │       │   └── route.ts
│   │       └── logout/
│   │           └── route.ts
│   │
│   ├── not-found.tsx
│   ├── error.tsx
│   └── loading.tsx
│
├── components/
│   ├── common/
│   ├── public/
│   └── private/
│
├── services/
│   ├── projectService.ts
│   ├── photoService.ts
│   └── foodService.ts
│
├── lib/
│   ├── auth/
│   └── supabase/
│       ├── server.ts
│       └── storage.ts
│
├── types/
│
├── config/
│   └── site.ts
│
└── data/

content/
└── articles/

public/
└── resume/

supabase/
└── migrations/
```

---

# 5. 网站整体设计风格

设计方向：

```text
Minimal
Modern
Clean
Personal
Editorial
```

公开区域偏：

```text
Portfolio
Editorial
作品集
个人主页
```

私密区域偏：

```text
Warm
Soft
Personal
安静
温暖
```

但不要做成：

```text
粉色恋爱模板
婚礼网站
情侣空间模板
```

---

# 6. 视觉限制

避免：

- 大量渐变。
- 大量毛玻璃。
- 大面积 Neon。
- 夸张发光。
- 大量阴影。
- 复杂粒子背景。
- 无意义动画。
- 大量滚动特效。
- AI 模板网站常见的紫色渐变。
- 过度圆角。
- 页面塞满 Card。
- 每个区域都使用不同视觉语言。

整体应该：

```text
克制
干净
具有留白
重视排版
重视图片
```

---

# 7. Responsive

必须支持：

```text
Desktop
Tablet
Mobile
```

Gallery 默认：

```text
Desktop: 3 Columns
Tablet:  2 Columns
Mobile:  1 Column
```

具体 breakpoint 可以自行调整。

禁止出现：

- 横向滚动。
- 导航栏超出屏幕。
- 图片溢出。
- 手机端文字过小。
- Card 手机端严重拥挤。

---

# 8. Accessibility

至少实现：

- Semantic HTML。
- 正确使用 heading。
- 图片包含 alt。
- Button 使用 `<button>`。
- 页面跳转使用 Next.js Link。
- Keyboard Navigation。
- Focus Visible。
- 合理的文字对比度。
- 基础 ARIA。
- Form Label。

---

# 9. 全局配置

创建统一配置。

例如：

```ts
export const siteConfig = {
  name: "Your Name",
  title: "Portfolio",
  description: "",
  email: "",
  github: "",
};
```

不要在多个组件重复硬编码：

```text
名字
邮箱
GitHub
网站标题
```

以后修改个人资料时应该尽可能只修改配置文件。

---

# 10. 公开区域首页

访问：

```text
/
```

或者部署后：

```text
http://IP/
```

默认进入公开首页。

首页主要用于展示：

```text
个人简介
作品 Gallery
```

页面建议结构：

```text
Navbar

Hero
简短个人介绍

Selected Works
作品 Gallery

Footer
```

不要写过多虚假的介绍内容。

Works 使用 `src/data/projects.ts` 中可直接维护的本地内容，不依赖数据库或临时 Mock 回退。

---

# 11. Public Navbar

公开导航栏：

```text
Home

Works

Articles

Resume
```

对应：

```text
Home
/

Works
/#works

Articles
/articles

Resume
/resume
```

要求：

- Desktop Navbar。
- Mobile Menu。
- 当前页面 Active 状态。
- Sticky 或 Fixed 均可。
- 滚动后保持可读。
- 不要影响页面主体宽度。

---

# 12. 首页作品 Gallery

首页核心区域：

```text
Selected Works
```

每个作品至少显示：

```text
Cover
Title
Description
Tags
```

数据结构：

```ts
interface Project {
  id: string;

  title: string;

  description?: string;

  coverFile?: string | readonly string[];

  tags?: readonly string[];

  projectDate?: string;

  projectUrl?: string;

  githubUrl?: string;

  published?: boolean;
}
```

作品对象集中维护在 `src/data/projects.ts`，数组顺序就是首页顺序。`coverFile` 保存一个媒体项目或最多 8 个媒体项目的数组；每一项可以是本地图片文件名或完整的 HTTPS B 站视频链接，也可以混合排列。多项媒体按照数组顺序同时铺成全宽纵向画廊，左右边缘对齐；图片加载后采用自身原始长宽比，视频使用 16:9 的 B 站官方外链播放器，画廊总高度不固定。单项保持单幅展示。不使用数据库字段或数据库时间戳。

`projectDate` 使用 `YYYY-MM - YYYY-MM`，首页显示为“YYYY年MM月—YYYY年MM月”，并在构建时检查月份与先后顺序。

Hover 可以包含轻微：

```text
Image Scale
Card Lift
Description Reveal
```

但动画必须克制。

---

# 13. Articles

访问：

```text
/articles
```

用于存放个人文章。

文章数据结构：

```ts
interface Article {
  id: string;

  slug: string;

  title: string;

  summary: string;

  cover?: string;

  tags: string[];

  createdAt: string;

  updatedAt?: string;
}
```

列表可以按照：

```text
年份
日期
```

排序。

例如：

```text
Articles

2026

Article A
Article B
Article C

2025

Article D
Article E
```

也可以使用简洁 Card / Timeline。

---

# 14. Article Detail

路由：

```text
/articles/[slug]
```

第一阶段文章使用：

```text
Markdown
```

存放：

```text
content/
└── articles/
    ├── article-a.md
    ├── article-b.md
    └── ...
```

不要将文章正文硬编码进 React Component。

封装统一文章读取逻辑。

以后增加 Markdown 文件即可增加文章。

---

# 15. Resume

访问：

```text
/resume
```

页面预留：

```text
Profile

Education

Experience

Projects

Skills

Contact
```

当前使用容易替换的 Mock Data。

重点：

```text
简洁
清晰
易阅读
```

预留按钮：

```text
Download Resume
```

未来 PDF 放入：

```text
public/resume/
```

不要目前生成假的复杂简历内容。

---

# 16. 私密区域入口

私密区域入口固定为：

```text
/yfxl99
```

私密子路由：

```text
/yfxl99

/yfxl99/photos

/yfxl99/food
```

注意：

> `/yfxl99` 只是入口路径，不是安全机制。

所有 `/yfxl99/*` 内容必须进行真实鉴权。

---

# 17. 私密区域密码

当前指定密码：

```text
8812345
```

但是：

**禁止将明文密码直接硬编码在浏览器端代码中。**

禁止：

```ts
if (password === "8812345")
```

出现在 Client Component 中。

---

# 18. 密码保存

真实密码不直接进入 Git Repository。

使用：

```text
PRIVATE_SITE_PASSWORD_HASH
```

保存 Password Hash。

实际密码：

```text
8812345
```

通过脚本或初始化程序生成 Hash。

推荐使用安全密码 Hash 算法。

例如：

```text
bcrypt
argon2
```

优先使用简单、稳定、适合当前 Node.js 部署环境的实现。

---

# 19. 登录流程

访问：

```text
/yfxl99
```

如果没有有效 Session：

显示登录界面。

页面结构：

```text
Private Space

Password

[              ]

Enter
```

提交：

```text
Browser

↓

POST /api/private/login

↓

Next.js Server

↓

验证 Password Hash

↓

创建 Session

↓

HttpOnly Cookie

↓

进入 /yfxl99
```

---

# 20. Session

登录成功后建立 Server Side Session。

Cookie 至少：

```text
HttpOnly

SameSite=Lax

Secure in Production

Path=/
```

Session 内容需要：

- 防篡改。
- 有过期时间。
- 不保存明文密码。

可以使用：

```text
Signed Cookie
```

或者其他轻量可靠实现。

当前项目只有一个共享密码：

**不要为了这个需求引入复杂用户系统。**

---

# 21. Session Secret

环境变量：

```text
SESSION_SECRET
```

用于 Session 签名。

要求：

```text
足够随机
足够长
仅 Server Side
不得提交 Git
```

---

# 22. Private Route Protection

必须统一保护：

```text
/yfxl99/*
```

未登录访问：

```text
/yfxl99/photos
```

或者：

```text
/yfxl99/food
```

不能获取页面内容。

应该跳转至：

```text
/yfxl99
```

登录页面。

不要仅仅：

```text
隐藏 Navbar
```

必须真正阻止服务器返回私密数据。

---

# 23. Private API Protection

未来私密 API：

```text
/api/private/photos

/api/private/food
```

同样必须验证 Session。

不能出现：

```text
页面受保护

但是 API 可以匿名访问
```

的问题。

---

# 24. Login Rate Limit

登录接口实现简单 Rate Limit。

目的是防止：

```text
暴力尝试密码
```

不需要引入复杂商业风控系统。

---

# 25. Logout

私密 Navbar 提供：

```text
Logout
```

调用：

```text
POST /api/private/logout
```

清除 Session。

Logout 后再次访问：

```text
/yfxl99/*
```

必须重新输入密码。

---

# 26. Private SEO

所有私密页面：

```html
<meta name="robots" content="noindex,nofollow">
```

同时：

```text
robots.txt
```

禁止：

```text
/yfxl99/
```

被常规搜索引擎抓取。

但：

> robots.txt 绝对不能作为安全措施。

---

# 27. Private Welcome

登录成功进入：

```text
/yfxl99
```

页面核心：

```text
Welcome
```

可以使用类似：

```text
Welcome

Some moments are worth keeping.
```

文案后续会修改。

当前不要填充大量内容。

视觉应该：

```text
简单
温暖
安静
```

---

# 28. Private Navbar

私密区域使用独立 Navbar。

导航：

```text
Home

Photos

Food

Logout
```

对应：

```text
Home
/yfxl99

Photos
/yfxl99/photos

Food
/yfxl99/food
```

Private Layout 不要与 Public Navbar 强耦合。

---

# 29. Photos

访问：

```text
/yfxl99/photos
```

用途：

```text
记录日常照片
```

当前阶段：

**不要设计复杂照片墙。**

只实现：

- 页面。
- 基础 Responsive Gallery。
- 数据结构。
- 数据库读取。
- 图片读取。
- Service Layer。
- Loading。
- Empty State。
- Error State。

---

# 30. Photo 数据结构

TypeScript：

```ts
interface PhotoEntry {
  id: string;

  storagePath: string;

  title?: string;

  description?: string;

  date: string;

  location?: string;

  tags: string[];

  createdAt: string;

  updatedAt: string;
}
```

页面最终需要支持：

```text
照片

日期

地点

标题

描述

Tags
```

当前只需要基础显示。

---

# 31. Food

访问：

```text
/yfxl99/food
```

用途：

```text
记录一起吃过的各种东西
```

当前阶段：

**不要设计复杂美食墙。**

只实现：

- 页面。
- Responsive Grid。
- 数据结构。
- 数据库读取。
- 图片读取。
- Service Layer。
- Loading。
- Empty State。
- Error State。

---

# 32. Food 数据结构

```ts
interface FoodEntry {
  id: string;

  name: string;

  storagePath: string;

  description?: string;

  restaurant?: string;

  location?: string;

  rating?: number;

  date: string;

  tags: string[];

  createdAt: string;

  updatedAt: string;
}
```

页面未来显示：

```text
图片

名称

餐厅

地点

日期

评分

备注
```

---

# 33. 数据库选择

项目统一使用：

```text
Supabase PostgreSQL
```

不要额外引入：

```text
MySQL

MongoDB

Firebase
```

当前网站的数据量较小，Supabase PostgreSQL 足够使用。

---

# 34. 图片存储

所有真实图片文件使用：

```text
Supabase Storage
```

禁止把图片：

```text
Binary

Base64
```

直接保存进 PostgreSQL。

---

# 35. 数据与图片职责

整体原则：

```text
PostgreSQL

负责：
这是什么


Supabase Storage

负责：
文件在哪里


Next.js Server

负责：
用户有没有权限访问
```

---

# 36. Storage Bucket

创建两个主要 Bucket：

```text
public-assets

private-diary
```

---

# 37. public-assets

用于：

```text
公开文章图片

其他公开媒体及旧资源兼容
```

目录例如：

```text
public-assets/
└── articles/
    └── ...
```

可以设置为：

```text
Public Bucket
```

新 Project 封面不再写入 Supabase Storage。它们位于服务器持久磁盘的：

```text
PROJECT_COVER_STORAGE_ROOT/projects/{filename}.{ext}
```

`src/data/projects.ts` 的 `coverFile` 可保存图片文件名与完整 HTTPS B 站视频链接组成的有序数组。图片由 `/api/projects/covers/...` 公开读取，视频由浏览器加载 B 站外链播放器。生产环境必须把 `PROJECT_COVER_STORAGE_ROOT` 配置到项目目录之外的持久磁盘。

---

# 38. private-diary

用于：

```text
照片墙

美食墙

未来其他私人媒体
```

例如：

```text
private-diary/
├── photos/
│   └── 2026/
│       └── 08/
│           ├── ...
│
└── food/
    └── 2026/
        └── 08/
            ├── ...
```

必须：

```text
Private Bucket
```

禁止设置：

```text
public = true
```

---

# 39. Private Storage 数据库字段

数据库不要保存永久公开 URL。

只保存：

```text
storage_path
```

例如：

```text
photos/2026/08/550e8400-e29b-41d4-a716-446655440000.webp
```

---

# 40. Signed URL

私密图片访问流程：

```text
Browser

↓

Next.js Server

↓

验证 Private Session

↓

读取 Database Metadata

↓

根据 storage_path 请求 Signed URL

↓

返回短时间有效 URL

↓

Browser 加载图片
```

Signed URL 默认：

```text
5 minutes
```

环境变量：

```text
PRIVATE_MEDIA_SIGNED_URL_TTL_SECONDS=300
```

不要将：

```text
300
```

散落硬编码在多个文件。

---

# 41. Private ViewModel

数据库 Entity 不保存 Signed URL。

可以建立：

```ts
interface PhotoViewModel extends PhotoEntry {
  imageUrl: string;
}
```

以及：

```ts
interface FoodViewModel extends FoodEntry {
  imageUrl: string;
}
```

`imageUrl` 仅在服务器读取数据之后临时生成。

---

# 42. Supabase Client 分层

建立：

```text
src/lib/supabase/
├── server.ts
└── storage.ts
```

---

# 43. server.ts

Server Side Only。

用于：

```text
Private DB Read

DB Write

Private Storage

Signed URL

Service Role Operations
```

任何引用：

```text
SUPABASE_SERVICE_ROLE_KEY
```

的文件必须是服务器专用模块。

---

# 44. Public Supabase Client

`src/lib/supabase/public.ts` 已删除。项目不再创建使用 anon key 的浏览器端 Supabase Client；Works 读取本地目录，Private 数据统一经 Server Side service-role Client 和 Session 鉴权访问。

---

# 45. storage.ts

封装：

```ts
getPrivateSignedUrl()

uploadPrivateAsset()

deletePrivateAssets()
```

这些函数只服务 Private 旧媒体兼容；Project 封面由 `src/lib/project/local-storage.ts` 完成路径校验，并由站内 Route Handler 流式返回。

当前阶段：

**不实现 Admin 上传 UI。**

但 Service 能够方便未来扩展。

---

# 46. Supabase Key 安全

以下：

```text
SUPABASE_SERVICE_ROLE_KEY
```

只能 Server Side 使用。

绝对禁止：

```text
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
```

绝对禁止 Service Role Key：

```text
进入浏览器

进入 HTML

进入 JS Bundle

进入 Git
```

---

# 47. Supabase Environment

`.env.example`：

```env
NEXT_PUBLIC_SUPABASE_URL=

SUPABASE_SERVICE_ROLE_KEY=

PRIVATE_SITE_PASSWORD_HASH=

SESSION_SECRET=

PRIVATE_MEDIA_SIGNED_URL_TTL_SECONDS=300
```

真实配置：

```text
.env.local
```

必须加入：

```text
.gitignore
```

---

# 48. Database Tables

Private 业务使用：

```text
photo_entries

food_entries
```

早期 Migration 中的 `projects` 表仅为历史兼容保留。当前 Works 不查询、不写入该表，也不要求数据库中存在作品记录。

文章继续：

```text
Markdown
```

简历继续：

```text
Static Data + PDF
```

不要为了所有内容统一而强行把文章和 Resume 放进数据库。

---

# 49. Works Local Catalog

作品信息唯一来源：

```text
src/data/projects.ts
```

通过 `defineProjects(...)` 在开发与构建时检查 ID、媒体数量、图片文件名、B 站视频链接、日期、链接和重复项。首页顺序使用数组顺序，`published: false` 表示隐藏。图片项目使用安全文件名，实际文件位于：

```text
PROJECT_COVER_STORAGE_ROOT/projects/{coverFile}
```

视频项目在 `coverFile` 中保存完整 HTTPS B 站视频地址，由 Project Service 转换为官方 `player.bilibili.com` 播放地址；图片与视频可以在同一个数组中混合，并按照数组顺序同时展示。

旧 `projects` 表和其中的 `cover_path`、`sort_order`、`is_published` 等字段不再参与运行时 Works 流程。

---

# 50. photo_entries Table

创建：

```sql
photo_entries
```

推荐：

```sql
id              uuid primary key

storage_path    text not null

title           text
description     text

photo_date      date not null

location        text

tags            text[]

created_at      timestamptz default now()
updated_at      timestamptz default now()
```

---

# 51. food_entries Table

创建：

```sql
food_entries
```

推荐：

```sql
id              uuid primary key

name            text not null

storage_path    text not null

description     text

restaurant      text
location        text

rating          smallint

food_date       date not null

tags            text[]

created_at      timestamptz default now()
updated_at      timestamptz default now()
```

添加 Constraint：

```text
rating IS NULL

OR

rating BETWEEN 1 AND 5
```

---

# 52. Database Migration

所有数据库结构必须进入：

```text
supabase/
└── migrations/
```

不要只在 Supabase Dashboard 手动创建表而不留下 SQL。

以下必须可通过 Migration 重建：

```text
Tables

Indexes

Constraints

Policies
```

保证未来从空数据库能够重新恢复 Schema。

---

# 53. RLS

Supabase Database 开启：

```text
Row Level Security
```

---

# 54. Legacy projects RLS

旧 Migration 仍为历史 `projects` 表保留只读 published policy，以兼容已经部署的数据库；当前首页不会创建 Supabase Client 来读取该表。

Works 的公开面只包括只读封面 Route Handler。它必须限制固定子目录、允许的扩展名和文件大小，并防止目录穿越。

---

# 55. private tables RLS

以下：

```text
photo_entries

food_entries
```

匿名 Supabase Client：

```text
不能 SELECT

不能 INSERT

不能 UPDATE

不能 DELETE
```

私密数据只通过：

```text
Next.js Server
```

访问。

---

# 56. 私密数据访问架构

必须：

```text
Browser

↓

Next.js

↓

验证 Private Session

↓

Server-side Supabase Client

↓

PostgreSQL / Storage
```

不能：

```text
Browser

↓

直接读取 photo_entries
```

---

# 57. Service Layer

建立：

```text
src/services/
├── projectService.ts
├── photoService.ts
└── foodService.ts
```

---

# 58. Project Service

实现：

```ts
getPublishedProjects()
```

该函数只读取 `src/data/projects.ts`，过滤 `published: false`，并逐项把图片文件名映射为站内封面 URL、把受支持的 B 站链接映射为视频媒体，保留两者在数组中的原始顺序。作品更新通过代码评审和重新部署完成，不实现数据库 CRUD 或管理 UI。

---

# 59. Photo Service

至少实现：

```ts
getPhotoEntries()

getPhotoEntryById()
```

内部负责：

```text
读取 Metadata

生成 Signed URL
```

未来预留：

```ts
createPhotoEntry()

updatePhotoEntry()

deletePhotoEntry()
```

---

# 60. Food Service

至少实现：

```ts
getFoodEntries()

getFoodEntryById()
```

未来预留：

```ts
createFoodEntry()

updateFoodEntry()

deleteFoodEntry()
```

---

# 61. 数据访问原则

正确：

```text
React Component

↓

Service

↓

Supabase Client

↓

PostgreSQL / Storage
```

避免：

```tsx
supabase
  .from(...)
```

散落在大量 UI Component。

---

# 62. 图片组件

统一封装图片展示。

例如：

```text
ProjectImage

GalleryImage

PhotoImage
```

需要处理：

- Lazy Loading。
- Responsive。
- Aspect Ratio。
- object-fit。
- Loading。
- Missing Image。
- alt。
- Error Fallback。

合理使用：

```text
next/image
```

---

# 63. Image Domain

如果使用 Supabase Storage Remote URL：

正确配置：

```text
next.config
```

中的：

```text
images.remotePatterns
```

不要直接：

```text
unoptimized
```

逃避 Next Image 配置，除非确有理由。

---

# 64. 图片上传规范

未来上传时统一经过：

```text
Upload Service
```

检查：

```text
MIME Type

File Size

Extension
```

主要支持：

```text
image/jpeg

image/png

image/webp
```

推荐长期存储：

```text
WebP
```

但不要为了转换导致明显质量损失。

---

# 65. Storage Object Key

不要直接使用原始文件名。

禁止：

```text
IMG_001.jpg

微信图片.jpg

food.jpg
```

统一使用：

```text
UUID
```

例如：

```text
photos/2026/08/550e8400-e29b-41d4-a716-446655440000.webp
```

避免：

```text
重名

特殊字符

中文路径问题

路径猜测
```

原始文件名如果未来需要，可以作为 Metadata 保存。

---

# 66. 删除逻辑

未来删除：

```text
Photo

Food
```

时，需要同时处理：

```text
Database Record

+

Storage Object
```

Service 统一封装。

不能长期产生：

```text
Orphan Storage Object
```

---

# 67. 第一阶段数据维护

当前：

**不做 Admin Dashboard。**

Works 通过：

```text
src/data/projects.ts

PROJECT_COVER_STORAGE_ROOT/projects/
```

维护。Private 数据仍通过受 Session 保护的页面和 Supabase Service 维护。

---

# 68. Seed Data

开发环境可以在本地目录提供少量真实或容易替换的作品数据：

```text
Typed Local Data
```

用于开发页面。

但是不要使用大量 Lorem Ipsum。

Works 不使用数据库 Seed；删除全部本地作品后页面仍应正常显示 Empty State。

---

# 69. Empty State

数据库没有项目时：

不要报错。

显示：

```text
No projects yet.
```

Photos 没有数据：

```text
No photos yet.
```

Food 没有数据：

```text
No food entries yet.
```

实际文案可以根据整体风格稍微调整。

---

# 70. Loading State

数据库或页面读取期间：

提供合理 Loading。

不要：

```text
全屏疯狂 Spinner
```

优先：

```text
Skeleton

Simple Loading State
```

---

# 71. Error Handling

增加：

```text
404

Error

Loading
```

页面。

服务器异常不能把：

```text
Stack Trace

Database Credential

Internal Error Detail
```

直接返回客户端。

---

# 72. SEO

公开区域实现：

```text
Metadata

title

description

Open Graph

favicon

sitemap

robots.txt
```

---

# 73. Page Metadata

例如：

```text
Home

<Name> — Portfolio


Articles

Articles — <Name>


Resume

Resume — <Name>
```

使用：

```text
siteConfig
```

生成。

不要重复硬编码个人名称。

---

# 74. Private Metadata

所有：

```text
/yfxl99/*
```

必须：

```text
noindex

nofollow
```

不要进入 Sitemap。

---

# 75. Security Header

合理增加基础安全 Header。

例如考虑：

```text
X-Content-Type-Options

Referrer-Policy

Permissions-Policy
```

如果实现 CSP，确保不要因为错误 CSP 导致：

```text
Next.js

Supabase Image

必要 Script
```

无法加载。

不要为了形式上的安全一次性添加大量未经验证的 Header。

---

# 76. Form UX

登录 Form：

- 有 Label。
- 有 Loading State。
- 防止重复提交。
- 错误密码显示友好 Error。
- Enter 可以提交。
- Password input 使用正确 type。
- 不泄露是密码错误还是服务异常的敏感细节。

例如：

```text
Incorrect password.
```

即可。

---

# 77. Public / Private Layout

至少拆分：

```text
RootLayout

Public Navbar / Public Content

PrivateLayout
```

Private Layout：

- 独立 Navbar。
- 独立视觉。
- 独立 Metadata。
- 统一 Auth Guard。

---

# 78. Current Routes

最终至少：

```text
/

/articles

/articles/[slug]

/resume

/yfxl99

/yfxl99/photos

/yfxl99/food
```

---

# 79. Current APIs

至少：

```text
POST /api/private/login

POST /api/private/logout
```

未来可以预留：

```text
GET /api/private/photos

GET /api/private/food
```

如果 Server Component 能直接通过 Service 获取数据：

第一阶段不强制实现多余 GET API。

不要为了所谓 RESTful 而增加不必要接口。

---

# 80. 不需要 Supabase Auth

当前 Private Site 是：

```text
一个共享密码
```

不是多用户系统。

因此当前：

**不要为了私密区域引入 Supabase Auth 用户注册登录系统。**

使用：

```text
Password Hash

+

Server Session
```

即可。

未来如果需求升级为：

```text
多用户

账号体系

不同权限
```

再迁移。

---

# 81. 不需要当前实现的功能

禁止自行增加：

```text
用户注册

多账号

Supabase Auth 用户系统

Google Login

GitHub Login

评论

点赞

关注

聊天

消息

Admin Dashboard

CMS

复杂图片编辑器

复杂在线上传系统

实时通信

WebSocket

Notification

全文搜索

推荐系统
```

---

# 82. 不要过度工程化

当前是：

```text
个人网站
```

不是企业 SaaS。

避免：

```text
Microservices

Redux

复杂 Event Bus

CQRS

DDD 全套

Kafka

Redis Cluster

GraphQL
```

等没有必要的架构。

保持：

```text
Simple

Clean

Maintainable
```

---

# 83. README

项目完成后必须编写：

```text
README.md
```

包含：

```text
项目简介

技术栈

目录结构

安装方式

开发运行

Production Build

Supabase 配置

Database Migration

Storage Bucket 配置

RLS 配置

环境变量

如何生成 PRIVATE_SITE_PASSWORD_HASH

如何修改私密密码

如何修改个人信息

如何添加 Project

如何添加 Article

如何添加 Photo

如何添加 Food

如何上传图片

如何配置 Resume PDF

如何部署
```

---

# 84. .env.example

项目必须提交：

```text
.env.example
```

不能提交：

```text
.env.local
```

---

# 85. .gitignore

确认：

```text
.env

.env.local

.env.*.local
```

不会提交 Git。

同时保留：

```text
.env.example
```

---

# 86. Development Commands

项目至少支持：

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run lint
```

```bash
npm run build
```

```bash
npm start
```

---

# 87. Code Quality Check

完成后必须执行：

```bash
npm run lint
```

以及：

```bash
npm run build
```

确保：

```text
无 TypeScript Error

无明显 ESLint Error

无 Hydration Error

无 Broken Import

无明显 Console Error

Production Build 成功
```

---

# 88. Browser Security Check

检查 Browser Source / Network：

不能找到：

```text
8812345

PRIVATE_SITE_PASSWORD_HASH

SESSION_SECRET

SUPABASE_SERVICE_ROLE_KEY
```

其中：

```text
8812345
```

除了用户自己在 Password Input 输入产生的 Request Payload 之外，不应该存在于静态 JS Bundle。

---

# 89. Private Database Security Check

未登录状态：

不能通过 Supabase Anonymous API 直接读取：

```text
photo_entries

food_entries
```

---

# 90. Private Storage Security Check

确保：

```text
private-diary
```

不是 Public Bucket。

匿名用户不能永久访问其中图片。

---

# 91. Public Security

Works 元数据编译进服务端构建产物，不开放写接口，也不接受浏览器提交的作品对象。

Project 封面接口匿名只读，并限制 `PROJECT_COVER_STORAGE_ROOT/projects/`、安全文件名、受支持图片扩展名、最大文件大小和路径越界。

---

# 92. 开发顺序

严格按照：

```text
1. 初始化 Next.js + TypeScript + Tailwind

2. 建立基础目录

3. 建立 siteConfig

4. 建立全局 Layout

5. 建立 Public Navbar

6. 完成 Public Home

7. 完成 Project Gallery

8. 完成 Articles

9. 完成 Article Detail

10. 完成 Resume

11. 配置 Supabase

12. 创建 Database Migration

13. 创建 Storage Bucket 说明 / 配置

14. 创建 Service Layer

15. 完成 Password Hash Auth

16. 完成 Session

17. 完成 Private Route Protection

18. 完成 Private Layout

19. 完成 Welcome

20. 完成 Photos

21. 完成 Food

22. 完成 Signed URL

23. 完成 Responsive

24. 完成 Accessibility

25. 完成 SEO

26. 完成 Error Handling

27. 完成 Security Review

28. 完成 README

29. npm run lint

30. npm run build
```

每完成一个阶段：

保证项目仍然能正常编译。

不要最后才统一解决所有错误。

---

# 93. Public 验收

访问：

```text
/
```

可以看到：

```text
Navbar

Hero

Selected Works

Project Gallery
```

---

访问：

```text
/articles
```

可以看到：

```text
文章列表
```

---

访问：

```text
/articles/test
```

如果存在对应 Markdown：

可以正常渲染文章。

---

访问：

```text
/resume
```

可以看到：

```text
Resume 页面
```

---

# 94. Private Login 验收

访问：

```text
/yfxl99
```

未登录：

显示 Password Form。

---

输入错误密码：

无法登录。

---

输入正确密码：

```text
8812345
```

成功进入：

```text
/yfxl99
```

并看到：

```text
Welcome
```

---

# 95. Private Route 验收

未登录访问：

```text
/yfxl99/photos
```

不能获取私密内容。

跳转：

```text
/yfxl99
```

---

未登录访问：

```text
/yfxl99/food
```

同样不能获取私密内容。

---

# 96. Private Session 验收

成功登录后：

```text
/yfxl99

/yfxl99/photos

/yfxl99/food
```

都可以正常访问。

---

点击：

```text
Logout
```

之后：

再次访问这些页面要求重新登录。

---

# 97. Photos 验收

登录后访问：

```text
/yfxl99/photos
```

能够：

```text
读取 photo_entries

根据 storage_path

生成 Signed URL

显示 private-diary 图片
```

---

# 98. Food 验收

登录后访问：

```text
/yfxl99/food
```

能够：

```text
读取 food_entries

根据 storage_path

生成 Signed URL

显示 private-diary 图片
```

---

# 99. Database 验收

Supabase 中存在 Private 业务表：

```text
photo_entries

food_entries
```

并存在对应 Migration。历史 `projects` 表可以保留，但 Works 的验收不能依赖它；Supabase 不可用时首页作品仍应显示。

---

# 100. Storage 验收

服务器本地持久存储：

```text
PROJECT_COVER_STORAGE_ROOT/projects/
```

用于 Project 公开封面；必须验证目录持久化、只读权限、路径越界防护和独立备份。

Supabase Storage：

```text
public-assets
```

用于公开资源。

```text
private-diary
```

用于私人资源。

其中：

```text
private-diary
```

禁止公开。

---

# 101. Signed URL 验收

Private Image URL：

必须：

```text
有有效期
```

而不是永久公开链接。

默认：

```text
300 seconds
```

---

# 102. 第一阶段最终效果

第一阶段完成后应该拥有：

```text
Public Website

├── Portfolio Home
├── Works Gallery
├── Articles
├── Article Detail
└── Resume


Private Website

└── /yfxl99
    ├── Password Login
    ├── Welcome
    ├── Photos
    └── Food
```

同时拥有：

```text
Supabase PostgreSQL

Supabase Storage

Private Session

Private Signed URL

RLS

Responsive UI

SEO

Accessibility

README

Database Migration
```

---

# 103. 当前阶段设计原则

如果某个视觉细节没有明确要求：

优先：

```text
简单

克制

清晰

易替换
```

而不是擅自增加：

```text
复杂设计

复杂动画

复杂业务
```

照片墙和美食墙未来会提供新的 UI 需求。

因此当前 Photos / Food 的 UI 必须：

```text
组件化

数据与 UI 分离

方便未来整体替换
```

---

# 104. 最重要的架构原则

整个项目遵循：

```text
Page / Component

↓

Service Layer

↓

Local Catalog / Supabase / Markdown / Storage
```

Works：

```text
Server Component
↓
Project Service
↓
Typed Local Catalog + Local Cover Route
```

Private Data：

```text
Browser

↓

Next.js Server

↓

Session Validation

↓

Service Layer

↓

Supabase PostgreSQL
+
Supabase Storage
```

最终目标：Private 中 PostgreSQL 负责元数据，Storage/本地磁盘负责文件，Next.js Server 负责权限；Works 中 TypeScript Catalog 负责元数据，持久磁盘负责封面，构建时校验负责一致性。

---

# 105. Codex 执行要求

请直接开始实现整个项目。

不要只输出代码示例。

需要：

```text
创建实际文件

创建目录

安装依赖

完成页面

完成组件

完成数据库 Migration

完成 Service

完成 Authentication

完成 Session

完成 Storage Integration

完成 README
```

如果当前目录已经存在 Next.js 项目：

优先基于现有项目修改。

如果不存在：

创建新的 Next.js 项目。

---

# 106. Codex 修改原则

开始之前先检查：

```text
当前目录

package.json

现有源码

现有配置
```

不要无条件覆盖已有代码。

如果已有合适实现：

在其基础上修改。

不要因为自己的架构偏好删除正常工作的模块。

---

# 107. Codex 完成后输出

最终完成后给出简洁 Summary：

```text
Implemented

Database

Storage

Authentication

Routes

Important Files

Environment Variables

Manual Supabase Setup

How to Run
```

明确说明：

哪些步骤已经自动完成。

哪些步骤仍然需要我进入 Supabase Dashboard 配置。

如果因为没有真实：

```text
Supabase URL

Supabase Key

Database
```

导致某些功能无法实际连接：

仍然完成全部代码和 Migration，并在 README 中明确配置方法。

不要因此停止项目实现。

---

# 108. 最终要求

不要只搭一个静态 UI Demo。

这个项目最终应该是一个：

> **Works 能以类型安全的本地目录长期维护，Private 能真实连接 Supabase、保存和读取照片/美食信息、安全保护恋爱日记，并且两部分边界清晰的完整个人网站骨架。**
