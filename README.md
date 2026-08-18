# Personal Portfolio

一个基于 Next.js App Router 的长期维护型个人网站骨架。公开区域用于作品、文章和简历；`/yfxl99` 是使用共享密码保护的私密照片与美食记录。项目不是静态 UI Demo：数据库、Storage、RLS、密码哈希、签名 Session 和私有图片 Signed URL 均已接入实际代码路径。

## 已实现内容

| 区域 | 实现 |
| --- | --- |
| Public | 首页 Hero、3/2/1 列作品 Gallery、文章列表、Markdown 文章详情、Resume 页面、响应式导航 |
| Private | `/yfxl99` 登录/Welcome、Photos、Food、独立导航、Logout、Loading/Empty/Error 状态 |
| Authentication | bcrypt 密码哈希校验、HS256 签名 Session、统一 Proxy/Auth Guard、HttpOnly Cookie、7 天过期、同源校验、简单登录限流 |
| Data | `projects`、`photo_entries`、`food_entries` Service Layer；未配置 Supabase 时仅公开作品使用本地 Mock |
| Storage | `public-assets` 公共 Bucket、`private-diary` 私有 Bucket、私密图片 5 分钟 Signed URL |
| Database | 完整 migration、索引、约束、updated_at trigger、RLS、Storage policies、可选 seed |
| Quality | TypeScript strict、Server/Client 边界、响应式、键盘焦点、语义 HTML、SEO、robots、sitemap、安全 Header |

没有实现 Admin Dashboard、注册、多用户、Supabase Auth 或上传 UI；这些均不属于当前阶段。

## 技术栈

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL + Storage
- `@supabase/supabase-js`
- `bcryptjs`（密码哈希）
- `jose`（签名 Session）
- `gray-matter` + `react-markdown`（文章）

要求 Node.js 22 或更高版本。

## 目录结构

```text
content/articles/                 Markdown 文章
public/resume/                    Resume PDF
scripts/                          密码哈希脚本
src/
├── app/
│   ├── (public)/                 公开页面与 Layout
│   ├── api/private/              Login / Logout API
│   ├── yfxl99/                   私密入口与受保护路由组
│   ├── robots.ts                 robots.txt
│   └── sitemap.ts                公开 Sitemap
├── components/
│   ├── common/                   图片、Empty State
│   ├── public/                   公开 UI
│   └── private/                  私密 UI
├── config/site.ts                个人资料与导航
├── data/                         可替换 Mock / Resume 数据
├── lib/
│   ├── auth/                     密码、Session、限流、请求校验
│   └── supabase/                 Public/Server Client 与 Storage
├── services/                     Project / Photo / Food 数据访问
├── types/                        Entity、Row、ViewModel 类型
└── proxy.ts                      私密页面 307 / 私密 API 401 入口保护
supabase/
├── migrations/                   Schema、Bucket、RLS、Policy
└── seed.sql                      可选公开 Project seed
```

## 安装与运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env.local
npm run dev
```

浏览器访问 `http://localhost:3000`。完整质量检查：

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

没有配置 Supabase 时，公开首页显示 `src/data/projects.ts` 的少量 Mock；文章和 Resume 正常工作；私密 Gallery 显示 Empty State。登录仍必须配置密码哈希与 Session Secret。

## 环境变量

复制 `.env.example` 为 `.env.local`，不要提交真实值。

| 变量 | 用途 | 暴露范围 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 站点绝对 URL，用于 metadata/sitemap | Public |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公开项目读取使用的 anon key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | 私密 DB、Storage、Signed URL | Server only |
| `PRIVATE_SITE_PASSWORD_HASH` | bcrypt hash，不是明文密码 | Server only |
| `SESSION_SECRET` | Session 签名密钥，至少 32 字符 | Server only |
| `PRIVATE_MEDIA_SIGNED_URL_TTL_SECONDS` | 私密图片 URL 有效期，默认 `300` | Server only |

Next.js 会对 `.env.local` 执行变量展开，因此 bcrypt Hash 中的每个 `$` 必须写成 `\$`。例如：

```env
PRIVATE_SITE_PASSWORD_HASH='\$2b\$12\$这里替换成完整Hash，并转义其中其余美元符号'
```

反斜杠仅用于本地 env 文件；在 Vercel 等部署平台的环境变量输入框中，应粘贴脚本输出的原始 Hash，不添加反斜杠。

生成 Session Secret：

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

绝对不要创建 `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`，也不要把任何真实 Secret 放入前端配置、源码或 Git。

## 生成密码 Hash

先安装依赖，再运行：

```bash
npm run hash-password
```

脚本会在交互式终端隐藏输入。首次部署可输入 `CODEX.md` 指定的初始密码。写入 `.env.local` 时，将输出 Hash 的每个 `$` 替换为 `\$`；写入 Vercel 等部署平台时直接使用原始输出。不要保存或提交明文密码。

也可传入参数，但该方式可能进入 Shell 历史，不推荐：

```bash
npm run hash-password -- "your-password"
```

修改私密密码时，重新生成 hash、更新部署环境变量并重新部署。若还要让全部已有 Session 立即失效，同时轮换 `SESSION_SECRET`；否则已签发 Session 最长仍可使用 7 天。

## Supabase 配置

### 1. 创建项目并填写 Keys

在 Supabase Project Settings 中取得 Project URL、anon key 和 service-role key，写入 `.env.local`。service-role key 仅被 `src/lib/supabase/server.ts` 这一服务器模块读取。

### 2. 执行 Database Migration

使用 Supabase CLI：

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

也可以在 Dashboard 的 SQL Editor 中执行 `supabase/migrations/202608180001_initial_schema.sql`。Migration 会自动创建：

- `projects`、`photo_entries`、`food_entries`；
- 日期/公开排序索引和 rating/path 约束；
- 自动更新 `updated_at` 的 trigger；
- 两个 Storage buckets；
- 全部 RLS 与公开 Storage policy。

可选开发数据：在 SQL Editor 执行 `supabase/seed.sql`。它只写入一个公开 Project，不写无对应图片对象的私密记录。

### 3. 核对 Storage Buckets

Migration 已创建：

- `public-assets`：Public，用于 `projects/`、`articles/`；
- `private-diary`：Private，用于 `photos/YYYY/MM/`、`food/YYYY/MM/`。

Dashboard 中必须确认 `private-diary` 的 Public 开关关闭。两个 Bucket 均限制为 JPEG、PNG、WebP，单文件最大 10 MB。

### 4. 核对 RLS

- anon/authenticated 只可 `SELECT projects WHERE is_published = true`；
- anon/authenticated 不能写 `projects`；
- `photo_entries` 与 `food_entries` 没有 anon/authenticated policy，因此不能匿名 CRUD；
- `public-assets` 允许匿名读取；
- `private-diary` 没有公开读取 policy；
- 私密数据仅由 Next.js server 的 service-role client 在 Session 验证后访问。

`robots.txt` 的禁止抓取只是 SEO 提示，真正的保护由服务器 Session、RLS 和 Private Bucket 完成。

## 内容维护

### 修改个人信息

编辑 `src/config/site.ts`：姓名、标题、描述、Email、GitHub 只维护一份。简历内容在 `src/data/resume.ts`。

### 修改私密 Welcome 首页

登录后的 `/yfxl99` 首页内容已独立到 `src/components/private/WelcomeHome.tsx`。可以直接修改该组件的文案和布局，不需要改动 `src/app/yfxl99/page.tsx` 中的 Session 判断或登录逻辑。

### 添加 Project

1. 如有封面，将 UUID 文件名图片上传到 `public-assets/projects/`。
2. 在 `projects` 表新增记录，`cover_path` 只写 Bucket 内路径，例如 `projects/UUID.webp`。
3. 设置 `is_published = true` 才会在首页出现；`sort_order` 越小越靠前。

示例：

```sql
insert into public.projects (
  title, description, cover_path, tags, project_date,
  project_url, github_url, sort_order, is_published
) values (
  'Project name',
  'Short description',
  'projects/UUID.webp',
  array['Next.js', 'Design'],
  '2026-08-18',
  'https://example.com',
  'https://github.com/example/repo',
  10,
  true
);
```

配置 Supabase 后，首页以数据库为准，不再显示本地 Project Mock。

### 添加 Article

在 `content/articles/` 新建安全的 kebab-case 文件名，例如 `a-new-note.md`：

```markdown
---
id: a-new-note
title: A new note
summary: One concise sentence.
tags:
  - Design
createdAt: 2026-08-18
---

Markdown content starts here.
```

不需要新建 React 页面；列表、详情、metadata 和 sitemap 会自动生成。原始 HTML 默认不会执行。

### 添加 Photo

1. 将图片上传到私有 Bucket，例如 `private-diary/photos/2026/08/UUID.webp`。
2. 数据库只保存 Bucket 内 `storage_path`，不要保存公开 URL。

```sql
insert into public.photo_entries (
  storage_path, title, description, photo_date, location, tags
) values (
  'photos/2026/08/UUID.webp',
  'A quiet afternoon',
  'Optional note',
  '2026-08-18',
  'Shanghai',
  array['daily']
);
```

### 添加 Food

1. 上传到 `private-diary/food/2026/08/UUID.webp`。
2. 插入 metadata；`rating` 只能为 `1` 到 `5` 或 `NULL`。

```sql
insert into public.food_entries (
  name, storage_path, description, restaurant,
  location, rating, food_date, tags
) values (
  'Dish name',
  'food/2026/08/UUID.webp',
  'Optional note',
  'Restaurant name',
  'Shanghai',
  5,
  '2026-08-18',
  array['dinner']
);
```

私密页面读取 metadata 后，服务器会为每个 `storage_path` 生成短期 Signed URL。URL 不写回数据库。

### 图片命名与删除

- 使用 UUID 文件名，支持 `.jpg`、`.jpeg`、`.png`、`.webp`；
- 不使用原始相机名、中文名或可预测路径；
- 删除 Photo/Food 时同时删除数据库行和 Storage object，避免孤儿文件；
- `src/lib/supabase/storage.ts` 已提供统一上传验证与 `deleteAsset()`，但当前没有 Admin UI。

### 配置 Resume PDF

将真实文件放为：

```text
public/resume/resume.pdf
```

页面会自动把 `PDF coming soon` 替换为 `Download resume`。不要放虚构 PDF。

## 路由与安全流程

公开路由：`/`、`/articles`、`/articles/[slug]`、`/resume`。

私密路由：`/yfxl99`、`/yfxl99/photos`、`/yfxl99/food`。私密子路由组在服务器 Layout 中调用统一 Auth Guard；Photo/Food Service 自身也再次校验 Session，未登录请求在读取数据库前重定向到 `/yfxl99`。

```text
Browser
  → POST /api/private/login
  → bcrypt hash verification + rate limit
  → signed HttpOnly/SameSite=Lax cookie
  → protected Server Component
  → session verification
  → server-only Supabase service-role client
  → PostgreSQL metadata + private Storage Signed URL
```

当前限流器按实例内存和请求 IP 工作，适合第一阶段与单实例部署；多实例、高流量公网部署应换成 Upstash/Redis 等共享存储限流器。反向代理必须可信地覆盖 `X-Forwarded-For`。

## 部署

### Vercel

1. 导入仓库；
2. 在 Project Settings 配置 `.env.example` 中全部变量；
3. 将 `NEXT_PUBLIC_SITE_URL` 设置为正式 HTTPS 域名；
4. 确保 Supabase migration 已执行；
5. Build Command 使用 `npm run build`；
6. 部署后检查 Login、Logout、未登录重定向和私密图片过期 URL。

### Node Server

```bash
npm install
npm run build
npm start
```

生产环境应置于 HTTPS 反向代理后。`NODE_ENV=production` 时 Session Cookie 使用 `Secure` 和 `__Host-` 前缀，因此 HTTPS 是必需的。

## 验收清单

- [ ] 将 `.env.example` 复制为 `.env.local` 并填写真实值
- [ ] 执行 migration，确认三张表与两个 Buckets
- [ ] 确认 `private-diary` 为 Private，私密表匿名查询失败
- [ ] 为 `CODEX.md` 指定的初始密码生成 hash
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] 未登录访问 Photos/Food 会重定向
- [x] 正确/错误密码、限流和 Logout 行为符合预期
- [x] 浏览器源码与静态 Bundle 中不存在明文密码或 Server Secrets

前三项 Supabase/生产 Secret 步骤需要项目所有者在自己的 Supabase Dashboard 和部署环境中完成。

## 验证记录

- 交付机原本没有 Node.js；使用未安装到系统的官方便携版 Node.js `22.23.2` 完成验证，并生成 `package-lock.json`。
- `npm run lint`：通过，0 error / 0 warning。
- `npm run typecheck`：通过，TypeScript strict 无错误。
- `npm run build`：通过；首页、Articles、Resume 静态生成，两个 Markdown 详情 SSG，私密页面/API 动态渲染，Proxy 生效。
- Production 冒烟：公开页面均为 `200`；未登录 Photos/Food 为 `307 → /yfxl99`；未来私密 API 默认 `401`；错误密码 `401`；正确密码 `200`；有效 Session 可访问；Logout 后重新 `307`。
- Rate Limit：同一客户端连续 6 次错误请求状态为 `401, 401, 401, 401, 401, 429`。
- 静态安全扫描：源码没有指定明文密码；扫描 19 个 `.next/static` 浏览器文件，未发现明文密码或 server-only 环境变量名。
- 视觉抽查：使用 production build 检查了 1440px 桌面和 500px 小屏布局，导航、排版与响应式断点正常。
- 未进行真实 Supabase 端到端读图：交付环境没有用户的 Supabase URL/Keys/数据；所需代码、Migration、Bucket 与 RLS 均已完成，按上文手动配置即可连接。
