# Personal Portfolio

一个基于 Next.js App Router 的长期维护型个人网站骨架。公开区域用于作品、文章和简历；`/yfxl99` 是使用共享密码保护的私密照片与美食记录。项目不是静态 UI Demo：数据库、可配置的 Food 本地文件目录、Supabase Storage 兼容层、RLS、密码哈希和签名 Session 均已接入实际代码路径。

## 已实现内容

| 区域 | 实现 |
| --- | --- |
| Public | 首页 Hero、3/2/1 列作品 Gallery、文章列表、Markdown 文章详情、Resume 页面、响应式导航 |
| Private | `/yfxl99` 登录、照片活跃度驱动的 WebGL2 程序化像素树 Welcome、Photos、支持多图上传/翻面/长按详情/统计的 Food 画廊、独立导航、Logout、Loading/Empty/Error 状态 |
| Authentication | bcrypt 密码哈希校验、HS256 签名 Session、统一 Proxy/Auth Guard、HttpOnly Cookie、7 天过期、同源校验、简单登录限流 |
| Data | `projects`、`photo_entries`、`food_entries`、`food_images` Service Layer；未配置 Supabase 时仅公开作品使用本地 Mock |
| Storage | 新 Food 图片写入 `FOOD_STORAGE_ROOT` 持久磁盘并经鉴权接口读取；Photo 与已有 Food 图片继续兼容 Supabase Storage |
| Database | 完整 migration、索引、约束、updated_at trigger、RLS、Storage policies、可选 seed |
| Quality | TypeScript strict、Server/Client 边界、响应式、键盘焦点、语义 HTML、SEO、robots、sitemap、安全 Header |

没有实现通用 Admin Dashboard、注册、多用户或 Supabase Auth；Food 页面包含自己专用的私密多图上传流程。

## 技术栈

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS 4
- 原生 WebGL2（程序化像素树）+ Canvas 2D 静态降级
- Supabase PostgreSQL + Storage（公开资源、Photo 与旧 Food 兼容）
- 服务器本地持久磁盘（新 Food 图片）
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
│   └── private/                  私密 UI、像素树场景与控制面板
├── config/site.ts                个人资料与导航
├── data/                         可替换 Mock / Resume 数据
├── lib/
│   ├── auth/                     密码、Session、限流、请求校验
│   ├── food/                     Food 校验、EXIF、地区、统计、本地存储、上传限流
│   ├── tree/                     照片活跃度纯函数
│   └── supabase/                 Public/Server Client 与 Storage
├── services/                     Project / Photo / Food 数据访问与 Food 草稿发布
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

没有配置 Supabase 时，公开首页显示 `src/data/projects.ts` 的少量 Mock；文章和 Resume 正常工作；私密 Gallery 显示 Empty State；Welcome 像素树的自动叶片密度为 0%，但树干、控制面板和页面内容仍正常显示。登录仍必须配置密码哈希与 Session Secret。

## 环境变量

复制 `.env.example` 为 `.env.local`，不要提交真实值。

| 变量 | 用途 | 暴露范围 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 站点绝对 URL，用于 metadata/sitemap | Public |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公开项目读取使用的 anon key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | 私密 DB、Photo/旧 Food Storage 与 Signed URL | Server only |
| `PRIVATE_SITE_PASSWORD_HASH` | bcrypt hash，不是明文密码 | Server only |
| `SESSION_SECRET` | Session 签名密钥，至少 32 字符 | Server only |
| `PRIVATE_MEDIA_SIGNED_URL_TTL_SECONDS` | Photo/旧 Food 私密 URL 有效期，默认 `300` | Server only |
| `FOOD_STORAGE_ROOT` | 新 Food 图片的持久化根目录；默认 `.data/private-media` | Server only |

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

也可以在 Dashboard 的 SQL Editor 中按文件名顺序执行：

1. `supabase/migrations/202608180001_initial_schema.sql`
2. `supabase/migrations/202608180002_food_groups_and_images.sql`

第一份 Migration 创建：

- `projects`、`photo_entries`、`food_entries`；
- 日期/公开排序索引和 rating/path 约束；
- 自动更新 `updated_at` 的 trigger；
- 两个 Storage buckets；
- 全部 RLS 与公开 Storage policy。

第二份 Migration 将 Food 从“一行一张图片”升级为“美食组 + 图片”：

- 保留原有 `food_entries` 行和原 Storage 对象，不重命名、不丢记录；
- 为旧行补齐组字段，并把旧 `storage_path` 回填成一条 `food_images`；
- 新建 `food_images`、顺序/尺寸/MIME/大小约束、索引、trigger 和 RLS；
- 为新上传增加 `draft / ready` 状态及幂等 `upload_request_id`；
- 固定记录时区为中国北京时间 `Asia/Shanghai`。

代码部署早于第二份 Migration 时，Food 页面会安全回退到旧单图字段继续浏览，并显示 Migration 提示、禁用新增按钮，不会再因缺少 `status` 或 `food_images` 整页崩溃。执行 Migration 后刷新页面即可自动切换到完整多图模式；若只执行了部分 SQL，页面会拒绝读取不完整结构，避免把 draft 数据误显示出来。

可选开发数据：在 SQL Editor 执行 `supabase/seed.sql`。它只写入一个公开 Project，不写无对应图片对象的私密记录。

### 3. 核对文件存储

Migration 已创建：

- `public-assets`：Public，用于 `projects/`、`articles/`；
- `private-diary`：Private；Photo 使用 `photos/YYYY/MM/`，切换前上传的 Food 路径继续兼容读取和删除。

Dashboard 中必须确认 `private-diary` 的 Public 开关关闭。两个 Bucket 均限制为 JPEG、PNG、WebP，单文件最大 10 MB。

新上传的 Food 图片不再写入 Supabase Storage，而是写到 `FOOD_STORAGE_ROOT/food/{groupId}/{imageId}.{ext}`。数据库仍只保存 `food/{groupId}/{imageId}.{ext}` 相对路径，既不保存 Windows/Linux 绝对路径，也不保存公开 URL。未配置 `FOOD_STORAGE_ROOT` 时，开发环境默认使用项目下的 `.data/private-media`；该目录已加入 `.gitignore`。生产环境必须显式配置到项目目录之外的持久磁盘，并单独备份。

### 4. 核对 RLS

- anon/authenticated 只可 `SELECT projects WHERE is_published = true`；
- anon/authenticated 不能写 `projects`；
- `photo_entries`、`food_entries` 与 `food_images` 没有 anon/authenticated policy，因此不能匿名 CRUD；
- `public-assets` 允许匿名读取；
- `private-diary` 没有公开读取 policy；
- 私密数据仅由 Next.js server 的 service-role client 在 Session 验证后访问。

`robots.txt` 的禁止抓取只是 SEO 提示，真正的保护由服务器 Session、RLS 和 Private Bucket 完成。

## 内容维护

### 修改个人信息

编辑 `src/config/site.ts`：姓名、标题、描述、Email、GitHub 只维护一份。简历内容在 `src/data/resume.ts`。

### 修改私密 Welcome 首页

登录后的 `/yfxl99` 首页入口保留在 `src/components/private/WelcomeHome.tsx`，实际场景位于 `src/components/private/tree/`。认证判断和服务端照片统计仍在 `src/app/yfxl99/page.tsx`，修改视觉时不要把该页面改成 Client Component，也不要移动或删除 Session 判断。

像素树完全由代码生成，不使用树木图片素材。相同 seed 与相同结构参数会生成相同的树；WebGL2 先渲染到低分辨率 framebuffer，再使用 nearest-neighbor 放大。叶片尺寸由算法自动分成 3px 打底、2px 中层和 1px 轮廓/高光细节，并按从大到小的顺序叠画，无需用户调节。浏览器不支持 WebGL2 时会自动显示相同分层规则的静态 Canvas 2D 树，导航和页面内容仍然可用。

场景不再显示 Welcome 标题和说明文字，树的水平投影位于画布正中心。树根上方额外绘制 165 个由 seed 确定的固定落叶像素：它们使用当前叶片色板，但不参与照片密度、风摆动或动态落叶回收。树下方显示一个滚动增量计时器，以北京时间 `2020-09-26 00:00:00+08:00` 为起点，按总天数及 `day / h / m / s` 每秒更新；浏览器从后台恢复时会直接用 `Date.now()` 校正，不累积定时器漂移。

#### 照片活跃度如何控制叶片

服务端的 `getPhotoActivityStats()` 只读取最新一条 `photo_entries.created_at`，并向浏览器传递距最后一次上传的天数、`0～1` 密度值和状态。它不会传递照片 URL、标题、位置或其他照片内容，也不再执行最近 30 天上传次数查询。

默认算法位于 `src/lib/tree/activity.ts`。只要存在一张照片，便从最后一次上传的 `created_at` 开始计时：

```text
从未上传：density = 0
days <= 21：density = 1
21 < days < 40：
  progress = (days - 21) / (40 - 21)
  density = 1 - progress³
days >= 40：density = 0
```

因此每次上传照片后会立即恢复为 100%：前 21 天保持不变，第 21～40 天按三次曲线先慢后快减少，第 40 天起附着叶片完全为 0。渲染数量直接使用 `round(候选叶片总数 × density)`，不再保留最低叶片数，也不再叠加第二条视觉幂曲线。Supabase 未配置、统计查询失败或从未上传时自动密度为 0%，页面仍保留完整树干和可用界面。

#### 控制面板

登录后控制面板默认展开，可调整：

- 照片活跃度自动驱动、手动叶片密度；
- seed、分枝深度、树冠宽度、树干粗细；
- 风力、风速、阵风、落叶率、重力、横向漂移；
- 默认雾白，以及春绿/秋金/夜蓝色板、像素倍率和播放/暂停。

结构参数使用 170ms 防抖重建，其他参数实时生效。“随机”只更换 seed，“恢复默认值”恢复项目默认配置。设置保存在当前浏览器的 `private-tree-controls:v2` 中；其中不保存照片统计、Cookie、Session 或 Token。删除该 localStorage key 即可清除本机自定义值。旧存储数据中的 `leafSize` 会被自动忽略，叶片始终由生成算法完成 3px/2px/1px 分层。

主要维护文件：

```text
src/components/private/tree/
├── ProceduralTree.tsx       React 生命周期、WebGL context 恢复、设置持久化
├── TreeControlPanel.tsx     控制面板
├── TreeElapsedTimer.tsx     day/h/m/s 滚动增量计时器
├── config.ts                默认值、参数校验、四套色板
├── elapsed.ts               2020-09-26 起算的纯时间函数
├── generation.ts            seeded PRNG、树干/枝条/树叶及固定根部落叶生成
├── particles.ts             落叶对象池
├── renderer.ts              WebGL2 buffer、framebuffer 与绘制
├── scene.ts                 动画循环、密度平滑、可见性暂停
├── shaders.ts               WebGL2 shaders
└── TreeFallback.tsx         Canvas 2D 静态降级
```

页面隐藏、动画暂停或组件卸载时会停止 `requestAnimationFrame`；渲染 DPR 上限为 2，叶片候选数上限为 8,000，空中落叶和落地叶片也分别设有固定上限。系统启用 `prefers-reduced-motion` 且浏览器没有已保存设置时，动画默认暂停，用户仍可在控制面板主动播放。

默认树形使用低幅度相关随机漂移的多段主干、不规则根系和树皮高光色块；左右侧枝与树冠主枝从相同高度成对生成，再加入少量长度、角度差异，整体更平衡但不会成为机械镜像。树形参考 `fff384aef3b21cd158dd32483f826f0d.jpg` 的大树冠比例，让低位分枝更早横向展开，用更宽、更低垂的重叠叶团缩短裸露主干。树冠不是均匀散点，而是多个边缘起伏、上亮下暗的叶团：内部 3px 叶片形成底层体块，2px 叶片塑造中层，边缘和上部高光由 1px 叶片收细。高活力时叶团会连成完整树冠，低活力时三种尺寸仍按确定性混合顺序逐步露出枝干。横屏和竖屏使用不同投影比例，避免手机画布把树拉成细长形。

本次叶片分层与树形调整涉及：

- `generation.ts`：为每片叶子确定固定的 3px/2px/1px 层级，扩大横向分枝和核心叶团，并取消叶冠下缘的水平截断；
- `generation.ts`、`renderer.ts`：在树根上方增加独立的固定落叶实例层，始终使用当前叶片色板且不受树冠密度影响；
- `activity.ts`：仅按最后上传日期计算密度，前 21 天为 100%，随后以三次曲线衰减，并在第 40 天归零；
- `renderer.ts`、`shaders.ts`、`particles.ts`：传递真实像素尺寸，附着叶片按 3px → 2px → 1px 的顺序叠画，落叶继承原叶片尺寸；
- `TreeFallback.tsx`：Canvas 2D 降级画面使用相同分层和绘制顺序；
- `config.ts`、`TreeControlPanel.tsx`：移除人工“叶片尺寸”参数，旧 localStorage 中的该字段会被安全忽略；
- `ProceduralTree.tsx`、`TreeElapsedTimer.tsx`、`elapsed.ts`：移除 Welcome 文案、居中树，并加入从北京时间 2020-09-26 00:00 起算的滚动增量计时；
- `Tree.md`：同步新的视觉目标、自动分层规则和控制参数清单。

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

登录后打开 `/yfxl99/food`，使用右下角“+”按钮建立一组记录。每组可选择 1～12 张 JPEG/PNG/WebP；支持预览、删除、调整顺序、1～5 星点击评分和最多 2000 字点评。单张上限 10 MB，整组上限 60 MB。

发生时间优先读取第一张图片的 EXIF `DateTimeOriginal`，没有则使用当前时间。EXIF 没有时区，所以统一按中国北京时间解释；表单时间和数据库 `timezone` 也固定为 `Asia/Shanghai`。用户手动修改时间后，重新排序或增加图片不会覆盖；“重新读取第一张”可主动恢复。地点候选和输入框只显示并保留中文字符，`CN`、`CN-BJ` 等稳定代码只在后台保存；数字、拉丁字母和符号会在输入时过滤，服务端也会拒绝非中文地点。不调用浏览器定位，也不上传 GPS。

上传不会把 service-role key 或服务器绝对路径交给浏览器：

```text
POST /api/private/food/uploads/init
  → 验证 Session、同源、限流、字段、数量和声明大小
  → 创建 draft 组与图片行
  → 返回每张图片专用的同源鉴权上传接口
PUT /api/private/food/uploads/{groupId}/{imageId}
  → 再次验证 Session、同源、草稿归属、MIME、大小、文件签名和尺寸
  → 原子写入 FOOD_STORAGE_ROOT/food/{groupId}/{imageId}.{ext}
Browser 最多并发 3 个 PUT，并展示每张进度
POST /api/private/food/uploads/complete
  → 服务器重新核对本地文件路径、数量、大小、MIME 与文件签名
  → 全部通过后一次性发布为 ready
```

同一 `upload_request_id` 可安全重试，单图失败可单独重试；取消会删除本组本地文件和草稿，失败组不会进入画廊。服务层会清理超过 24 小时的旧草稿及对应文件。画廊只查询 `ready` 组：本地图片通过 `/api/private/food/images/{id}/file` 在验证 Session 后读取，已有 Supabase Food 图片仍使用短期 Signed URL；单图加载失败时可以重新解析正确来源。

Food 页面不显示额外标题文案，进入后直接展示画廊。组内每张图都作为独立卡片连续显示。点击卡片以非线性动效翻面，查看分类、地点和北京时间；按住 450 ms 打开详情，桌面显示右侧资料栏，手机显示下方资料区。详情中的“修改”可更新整组分类、中文地点、北京时间、评分和点评，不替换图片；“删除”经不可恢复确认后删除整组及全部图片。删除时先把组切到隐藏的 `draft` 状态，再按实际来源清理精确本地文件或旧 Storage 对象并级联删除数据库行；文件清理失败会尝试恢复 `ready`，数据库末步失败则保留隐藏草稿供旧草稿清理流程继续处理。左下角“统计”按组计算记录、分类、地点、评分和时间线，只有“照片数”按图片计算，因此多图组只增加一条记录。

主要实现文件：

```text
src/app/yfxl99/(protected)/food/page.tsx
src/app/api/private/food/
├── groups/[id]/route.ts
├── images/[id]/file/route.ts
├── images/[id]/url/route.ts
├── uploads/{init,complete,cancel}/route.ts
└── uploads/[groupId]/[imageId]/route.ts
src/components/private/food/
├── FoodExperience.tsx
├── FoodGallery.tsx
├── FoodCard.tsx
├── FoodDetailDialog.tsx
├── FoodEditDialog.tsx
├── FoodUploadDialog.tsx
├── FoodImagePicker.tsx
├── FoodLocationPicker.tsx
└── FoodStatsPanel.tsx
src/lib/food/
├── contracts.ts
├── image-headers.ts
├── image-metadata.ts
├── local-storage.ts
├── locations.ts
├── statistics.ts
└── upload-rate-limit.ts
src/services/foodService.ts
supabase/migrations/202608180002_food_groups_and_images.sql
```

### 图片命名与删除

- 使用 UUID 文件名，支持 `.jpg`、`.jpeg`、`.png`、`.webp`；
- 不使用原始相机名、中文名或可预测路径；
- 新 Food 数据库路径必须为 `food/{groupId}/{imageId}.{extension}`，实际文件位于 `FOOD_STORAGE_ROOT` 下的同名相对路径；旧 `food/YYYY/MM/` 路径仅为 Supabase 兼容；
- 删除 Photo/Food 时同时删除数据库行和对应本地文件或 Storage object，避免孤儿文件；
- `src/lib/food/local-storage.ts` 负责根目录配置、路径越界防护、写入、读取与精确删除；`src/lib/supabase/storage.ts` 继续负责 Photo 和旧 Food 的 Signed URL/对象兼容。

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
  → PostgreSQL metadata
  → Food local authenticated file response / Photo and old Food Storage Signed URL
```

当前限流器按实例内存和请求 IP 工作，适合第一阶段与单实例部署；多实例、高流量公网部署应换成 Upstash/Redis 等共享存储限流器。反向代理必须可信地覆盖 `X-Forwarded-For`。

## 部署

### Vercel

公开页面仍可部署到 Vercel，但当前 Food 新上传依赖可持续写入的本地磁盘，不能使用 Vercel 函数的临时文件系统保存。若要在 Vercel 运行完整 Food 功能，需要另行接入对象存储；当前推荐部署到带持久云硬盘的腾讯云 CVM。

### 腾讯云 CVM

1. 将一块持久云硬盘挂载到固定位置，例如 `/data`；
2. 创建 `/data/mypage`，确保运行 Node.js 的系统用户拥有读写权限；
3. 在生产环境设置 `FOOD_STORAGE_ROOT=/data/mypage`；
4. 如果使用 Docker，把宿主机持久目录挂载到容器内相同的配置路径；
5. 配置 Supabase、密码和 Session 环境变量，执行两份 Migration；
6. 使用 HTTPS 反向代理运行 `npm start`，并定期备份 `/data/mypage`。

以后更换磁盘位置只需修改 `FOOD_STORAGE_ROOT` 并把原目录内容完整复制到新目录；数据库内的 `food/...` 相对路径不需要修改。

### Node Server

```bash
npm install
npm run build
npm start
```

生产环境应置于 HTTPS 反向代理后。`NODE_ENV=production` 时 Session Cookie 使用 `Secure` 和 `__Host-` 前缀，因此 HTTPS 是必需的。
Node 进程还必须对 `FOOD_STORAGE_ROOT` 拥有持续读写权限。不要把生产路径设在源码目录、`.next`、系统临时目录或容器未挂载的可写层中。

## 验收清单

- [ ] 将 `.env.example` 复制为 `.env.local` 并填写真实值
- [ ] 按顺序执行两份 migration，确认 `projects`、`photo_entries`、`food_entries`、`food_images` 与两个 Buckets
- [ ] 确认 `private-diary` 为 Private，三张私密表匿名查询失败
- [ ] 将 `FOOD_STORAGE_ROOT` 指向持久磁盘，确认 Node 进程可读写并配置目录备份
- [ ] 为 `CODEX.md` 指定的初始密码生成 hash
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] 未登录访问 Photos/Food 会重定向
- [x] Food API 未登录返回 401、跨站写入返回 403、超大 JSON 返回 413
- [x] Food 桌面/手机瀑布流、翻面、长按详情、统计、图片选择和上传弹窗通过 Chrome 验收
- [x] 正确/错误密码、限流和 Logout 行为符合预期
- [x] 浏览器源码与静态 Bundle 中不存在明文密码或 Server Secrets

Supabase、生产 Secret 和持久磁盘步骤需要项目所有者在自己的 Dashboard 与部署环境中完成；其中第二份 Food Migration 和 `FOOD_STORAGE_ROOT` 都不能遗漏。

## 验证记录

- 交付机原本没有 Node.js；使用未安装到系统的官方便携版 Node.js `22.23.2` 完成验证，并生成 `package-lock.json`。
- `npm run lint`：通过，0 error / 0 warning。
- `npm run typecheck`：通过，TypeScript strict 无错误。
- `npm run build`：通过；首页、Articles、Resume 静态生成，两个 Markdown 详情 SSG，私密页面/API 动态渲染，Proxy 生效。
- Production 冒烟：公开页面均为 `200`；未登录 Photos/Food 为 `307 → /yfxl99`；未来私密 API 默认 `401`；错误密码 `401`；正确密码 `200`；有效 Session 可访问；Logout 后重新 `307`。
- Rate Limit：同一客户端连续 6 次错误请求状态为 `401, 401, 401, 401, 401, 429`。
- 静态安全扫描：源码没有指定明文密码；扫描 19 个 `.next/static` 浏览器文件，未发现明文密码或 server-only 环境变量名。
- 视觉抽查：使用 production build 检查了 1440px 桌面和 500px 小屏布局，导航、排版与响应式断点正常。
- 像素树浏览器验收：登录后在 Chrome WebGL2 环境检查 1440×960 与 390×844；100% 手动密度下确认大树冠、缩短的裸露树干和 3px/2px/1px 叶片层次，shader 无运行时错误，桌面/手机均无页面溢出；控制面板可滚动、收起、重新打开，自动/手动密度切换与 localStorage 持久化正常。
- 树形平衡验收：使用 production build 在 1440×960 Chrome WebGL2 中复核默认 seed；主干保持接近竖直，左右侧枝同高度成对展开，同时仍保留非镜像的自然差异，无运行时错误和页面溢出。
- 叶片时间曲线验收：纯函数边界与单调性通过；第 21、22、30、35、39、40 天密度分别约为 `100%`、`99.99%`、`89.37%`、`59.99%`、`14.97%`、`0%`，从未上传和统计不可用时为 `0%`。
- 固定落叶与计时器验收：production build 下分别检查 0% 和 100% 叶片密度；0% 时 165 个固定根部落叶仍使用当前叶片色板显示，树在 1440×960 与 390×844 画布中保持水平居中，Welcome 文案不存在；计时器连续采样均每秒前进，桌面/手机无溢出且 WebGL 无运行时错误。
- 增量时间纯函数验收：北京时间起点本身得到 `0 day 00 h 00 m 00 s`，增加 90,061 秒后准确得到 `1 day 01 h 01 m 01 s`。
- 像素树质量检查：`npm run lint` 与 `npm run typecheck` 通过；扫描 19 个 `.next/static` 文件，未发现明文密码、Password Hash、Session Secret 或 Service Role 变量名。
- 像素树生产构建：当前 `.env.local` 指向的公开 Supabase `projects` 查询在预渲染时不可用；未修改该文件，改用项目已有的“未配置 Supabase”回退模式完成 `npm run build`，所有路由成功生成。正式部署前应确认 Supabase 项目可从构建环境访问。
- Food 生产构建：`npm run typecheck`、`npm run lint`、`npm run build` 全部通过；构建产物包含组修改/删除、本地图片读取、图片来源刷新、上传 `init / per-file PUT / complete / cancel` 共七个动态 Food API 路由。
- Food Chrome 验收：用不进入正式代码的临时本地数据检查 1440×960 与 390×844；9 张图片分别显示为桌面 4 列、手机 2 列不等高瀑布流，均无横向溢出或控制台错误；点击翻面、450 ms 长按、详情同组切换区、`Escape`、统计展开和桌面/手机上传弹窗均正常。
- Food 图片校验验收：上传弹窗读取本地 JPEG 后正确显示文件预览、`44KB` 与 `736×736` 尺寸；服务器文件头解析以真实 JPEG 及合成 PNG/WebP 头验证，三种格式均正确复验尺寸；没有发起外部上传。
- Food 修改验收：production Chrome 中以 450 ms 长按打开详情，确认“修改 / 删除”入口；桌面与 390×844 手机编辑弹窗无横向溢出或控制台错误。291 个地区候选均为纯中文，混合输入会过滤为中文，非中文地点 PATCH 返回 `400`；未提交修改或确认删除现有数据。
- Food 本地文件验收：使用独立临时根目录验证 `FOOD_STORAGE_ROOT` 生效、重复上传安全覆盖、限长读取、目录穿越拒绝和精确删除，测试结束后临时文件与目录均已清理；生产构建包含本地 PUT 与鉴权读取路由，且不再触发动态目录的全项目文件追踪警告。
- Food API 安全冒烟：未登录页面 `307 → /yfxl99`，未登录 API `401`，携带有效本地测试 Session 的跨站 POST `403`，同源非法字段 `400`，超过 64KB 的 JSON `413`，有效 Session 页面 `200`。
- Food 本地路由冒烟：独立 production server 中，本地图片读取路由和逐文件 PUT 路由在没有 Session 时均返回 `401`；测试服务器已停止，没有残留监听端口。
- Food 静态安全扫描：扫描 21 个 `.next/static` 文件，未发现 `SUPABASE_SERVICE_ROLE_KEY`、密码 Hash、Session Secret 的变量名或实际值。
- 未对正式数据库执行真实 Food 写入或删除：现有数据没有被修改。项目所有者仍需执行第二份 Migration，并在最终 `FOOD_STORAGE_ROOT` 上上传一组多图，核对数据库相对路径、本地文件、旧 Supabase 图片回退与整组删除。
