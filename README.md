# Personal Portfolio

一个基于 Next.js App Router 的长期维护型个人网站骨架。公开区域用于作品、文章和简历；`/yfxl99` 是仅限受邀账号访问的私密照片与美食记录。Works 使用本地 TypeScript 目录和服务器持久磁盘封面；Articles 使用 Supabase PostgreSQL、服务器本地封面和密码保护的 Markdown 发布页；Private 区域的数据库、本地媒体目录、Supabase Storage 兼容层、RLS、账号密码和签名 Session 均已接入实际代码路径。

## 已实现内容

| 区域 | 实现 |
| --- | --- |
| Public | 首页 Hero、作品 Gallery、最新 6 篇精选文章、数据库文章列表、带本地封面的 Markdown 编辑/预览/发布与文章详情、Resume、可移除的 Tools 故事编辑器、响应式导航 |
| Private | `/yfxl99` 登录、照片活跃度驱动的 WebGL2 程序化像素树 Welcome、支持上传/翻面/长按原位展开/统计/修改删除/账号评论的 Photos、支持多图和账号评论的 Food 画廊、独立导航、Logout、Loading/Empty/Error 状态 |
| Authentication | 账号 + bcrypt 密码、一次性邀请码注册、HS256 签名 Session、统一 Proxy/Auth Guard、HttpOnly Cookie、7 天过期、同源校验、简单登录限流 |
| Data | Works 使用类型安全的本地 TypeScript 目录；Articles、账号/邀请、Photo/Food 记录与评论使用 Supabase Service Layer |
| Storage | Project/Article 封面及新 Photo/Food 图片写入各自持久磁盘目录；Project/Article 经公开接口读取，Photo/Food 经鉴权接口读取；旧媒体继续兼容 Supabase Storage |
| Database | Articles 与 Private 数据使用 migration、索引、约束、updated_at trigger 和 RLS；Works 不依赖数据库 |
| Quality | TypeScript strict、Server/Client 边界、响应式、键盘焦点、语义 HTML、SEO、robots、sitemap、安全 Header |

没有实现通用 Admin Dashboard 或 Supabase Auth；受邀用户在 `/yfxl99` 注册，Photos 和 Food 页面各自包含私密上传流程，新上传记录会展示上传账号。

## 技术栈

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS 4
- 原生 WebGL2（程序化像素树）+ Canvas 2D 静态降级
- Supabase PostgreSQL + Storage（Articles、Private 数据与旧媒体兼容）
- 服务器本地持久磁盘（Project/Article 封面及新 Photo/Food 图片）
- `@supabase/supabase-js`
- `bcryptjs`（密码哈希）
- `jose`（签名 Session）
- `react-markdown` + `remark-gfm`（文章编辑预览与详情渲染）

要求 Node.js 22 或更高版本。

## 目录结构

```text
public/resume/                    Resume PDF
scripts/                          邀请码与文章密码哈希生成脚本
src/
├── app/
│   ├── (public)/                 公开页面与 Layout
│   ├── api/articles/             密码保护的文章发布 API
│   ├── api/private/              Register / Login / Logout 与私密媒体 API
│   ├── yfxl99/                   私密入口与受保护路由组
│   ├── robots.ts                 robots.txt
│   └── sitemap.ts                公开 Sitemap
├── components/
│   ├── common/                   图片、Empty State
│   ├── public/                   公开 UI
│   └── private/                  私密 UI、像素树场景与控制面板
├── config/site.ts                个人资料与导航
├── data/                         本地 Works 目录 / Resume 数据
├── lib/
│   ├── auth/                     账号、密码、Session、限流、请求校验
│   ├── food/                     Food 校验、EXIF、地区、统计、本地存储、上传限流
│   ├── photo/                    Photos 校验、统计、本地存储
│   ├── project/                  Works 目录校验、封面本地存储
│   ├── tree/                     照片活跃度纯函数
│   └── supabase/                 Private Server Client 与旧 Storage 兼容
├── services/                     Articles / Works / Photo / Food 数据访问与发布
├── types/                        Entity、数据库 Row、ViewModel 类型
└── proxy.ts                      私密页面 307 / 私密 API 401 入口保护
supabase/
├── migrations/                   Articles、Private Schema、Bucket、RLS、Policy（含旧 Project 兼容表）
└── seed.sql                      说明文件；Works 不需要数据库 seed
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

没有配置 Supabase 时，首页 Works 和 Resume 仍能正常工作；Articles 列表显示为空且无法发布，账号注册、登录和私密 Gallery 也不可用。Articles 和私密空间都需要 Supabase URL 与 service-role key。

## 环境变量

复制 `.env.example` 为 `.env.local`，不要提交真实值。

| 变量 | 用途 | 暴露范围 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 站点绝对 URL，用于 metadata/sitemap | Public |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Articles、私密 DB、Photo/旧 Food Storage 与 Signed URL | Server only |
| `SESSION_SECRET` | Session 签名密钥，至少 32 字符 | Server only |
| `ARTICLE_PUBLISH_PASSWORD_HASH` | `/articles/new` 发布密码的 bcrypt 哈希；用 `npm run hash-article-password` 生成 | Server only |
| `PRIVATE_MEDIA_SIGNED_URL_TTL_SECONDS` | Photo/旧 Food 私密 URL 有效期，默认 `300` | Server only |
| `PROJECT_COVER_STORAGE_ROOT` | Project 封面的持久化根目录；默认 `.data/public-assets` | Server only |
| `ARTICLE_COVER_STORAGE_ROOT` | Article 封面的持久化根目录；为空时回退到 Project 根目录 | Server only |
| `FOOD_STORAGE_ROOT` | 新 Food 图片的持久化根目录；默认 `.data/private-media` | Server only |
| `PHOTO_STORAGE_ROOT` | 新 Photo 图片的持久化根目录；空值时回退到 `FOOD_STORAGE_ROOT`，再回退到 `.data/private-media` | Server only |
| `TOOLS_STORAGE_ROOT` | Tools 模块数据根目录；默认 `.data/tools`，生产环境应指向持久磁盘 | Server only |

生成 Session Secret：

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

绝对不要创建 `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`，也不要把任何真实 Secret 放入前端配置、源码或 Git。

## 创建邀请码

先执行账号 Migration，再生成一个高熵邀请码：

```bash
npm run generate-invite
```

脚本输出一份原始邀请码和对应 SHA-256 摘要。只把摘要写入数据库：

```sql
insert into public.private_invites (code_digest, label, max_uses, expires_at)
values ('<脚本输出的摘要>', '首次邀请', 1, now() + interval '7 days');
```

把原始邀请码安全地发给受邀者，不要发送摘要，也不要自行使用短码。受邀者在 `/yfxl99` 输入账号、密码和邀请码；注册成功后邀请码会在同一数据库事务内消耗，并自动登录。数据库仅保存 bcrypt 密码哈希和邀请码摘要，不保存两者的原文。

## Supabase 配置

### 1. 创建项目并填写 Keys

在 Supabase Project Settings 中取得 Project URL 和 service-role key，写入 `.env.local`。项目不再创建浏览器端 Supabase Client，因此不需要 anon key；service-role key 仅被 `src/lib/supabase/server.ts` 这一服务器模块读取。

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
3. `supabase/migrations/202608190001_photo_local_gallery.sql`
4. `supabase/migrations/202609010001_private_accounts_and_ownership.sql`
5. `supabase/migrations/202609010002_food_comments.sql`
6. `supabase/migrations/202609010003_photo_comments.sql`
7. `supabase/migrations/202609010004_food_pagination_index.sql`
8. `supabase/migrations/202609010005_photo_pagination_index.sql`
9. `supabase/migrations/202609030001_articles.sql`
10. `supabase/migrations/202609030002_article_covers.sql`
11. `supabase/migrations/202609040001_calendar_journal.sql`
12. `supabase/migrations/202609040002_calendar_thumbnails.sql`
13. `supabase/migrations/202609040003_calendar_month_notes.sql`
14. `supabase/migrations/202609040004_calendar_shared_entries.sql`
15. `supabase/migrations/202609040005_calendar_shared_month_notes.sql`
16. `supabase/migrations/202609050001_photo_groups_and_images.sql`

第一份 Migration 创建：

- `photo_entries`、`food_entries`，以及历史兼容用的 `projects` 表；
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

第三份 Migration 在不移动旧图片的前提下升级 Photos：

- 保留所有 `photo_entries` 和原 Supabase Storage 路径，并标记为 legacy；
- 增加北京时间、中文地区、真实尺寸、MIME、字节数等元数据；
- 增加 `draft / ready` 发布状态和幂等 `upload_request_id`；
- 为本地 `photos/{photoId}/{photoId}.{ext}` 路径、尺寸、大小和类型建立约束与索引。

第四份 Migration 增加受邀账号和上传署名：

- 新建 `private_users` 与 `private_invites`，只保存 bcrypt 密码哈希和高熵邀请码的 SHA-256 摘要；
- 新建只允许 service-role 调用的事务注册函数，在并发注册时原子地创建账号并消耗邀请码；
- 为 `photo_entries` 与 `food_entries` 增加可为空的 `owner_user_id`；
- 历史记录保留且不伪造上传者，新上传草稿自动写入当前账号。

第五份 Migration 增加 Food 评论：

- 新建 `food_comments`，评论随所属 Food 删除；
- 评论作者来自服务器 Session，并保留发布时的用户名快照；
- 浏览器角色不能直接读写评论，所有操作继续经过 Next.js 鉴权接口。

第六份 Migration 以相同安全模型增加 Photo 评论：

- 新建 `photo_comments`，评论随所属照片删除；
- 评论作者同样来自服务器 Session，并保留发布时的用户名快照；
- Food 与 Photo 共用前端评论组件，但表、外键和接口彼此独立。

第七、八份 Migration 为 Food 与 Photo 的稳定游标分页补充复合索引。第九份 Migration 创建 `articles` 表、Markdown 正文、公开文章排序索引、字段约束和 `updated_at` trigger；第十份为文章增加服务器本地封面 URL 字段及格式约束。浏览器角色不能直接访问该表，文章读取和发布统一经过 Next.js service-role 服务层。

代码部署早于第二/第三份 Migration 时，Food/Photos 页面都会安全回退到旧字段继续浏览，并显示 Migration 提示、禁用写操作。账号版代码部署前必须先执行第四份 Migration 并创建至少一个邀请码，否则原共享密码将停止工作，注册/登录会返回服务不可用。评论版代码部署前应执行第五、六份 Migration；缺失时画廊仍可浏览，但对应评论接口会明确提示应执行的文件。执行账号 Migration 后再部署代码，旧的共享密码 Session 会自然失效。

`supabase/seed.sql` 不再写入作品。Works 的唯一数据源是 `src/data/projects.ts`，不需要在 SQL Editor 中添加或更新 Project。

### 3. 核对文件存储

Migration 已创建：

- `public-assets`：Public，仅保留给旧 Article 和其他公开资源；新 Project/Article 封面都不再写入该 Bucket；
- `private-diary`：Private；旧 Photo 使用 `photos/YYYY/MM/`，切换前上传的 Food 路径继续兼容读取和删除。

Dashboard 中必须确认 `private-diary` 的 Public 开关关闭。两个 Bucket 均限制为 JPEG、PNG、WebP，单文件最大 10 MB。

Project 图片封面位于 `PROJECT_COVER_STORAGE_ROOT/projects/{filename}.{ext}`，并由 `/api/projects/covers/...` 公开读取；`src/data/projects.ts` 的 `coverFile` 可保存一个媒体项目或最多 8 个媒体项目的数组，每一项可以是图片文件名或完整的 HTTPS B 站视频链接。开发环境未配置时默认使用 `.data/public-assets`。

新上传的 Photos 和 Food 图片不再写入 Supabase Storage，而是分别写到 `PHOTO_STORAGE_ROOT/photos/{photoId}/{photoId}.{ext}` 与 `FOOD_STORAGE_ROOT/food/{groupId}/{imageId}.{ext}`。数据库只保存对应相对路径，既不保存 Windows/Linux 绝对路径，也不保存公开 URL。`PHOTO_STORAGE_ROOT` 为空时会与 Food 共用根目录；两者都未配置时，开发环境默认使用项目下的 `.data/private-media`。以上本地目录在生产环境都必须显式配置到项目目录之外的持久磁盘，并单独备份。

### 4. 核对 RLS

- 第一份历史 Migration 仍保留 `projects` 的只读 RLS policy，但首页不会发起该查询；
- Works 不通过 anon/authenticated 角色读写数据库；
- `articles`、`private_users`、`private_invites`、`photo_entries`、`food_entries`、`food_images`、`food_comments` 与 `photo_comments` 没有 anon/authenticated policy，因此不能由浏览器直接 CRUD；
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

场景不再显示 Welcome 标题和说明文字，树的水平投影位于画布正中心。树干底部由一对低矮根颈和 3 根辅根组成钟形基座：根部使用 2～3 段浅弧线横向贴地收细，不再从中心放射或向下形成爪状。树根上方额外绘制 165 个由 seed 确定的固定落叶像素：先铺一条紧贴地面的连续薄底，再围绕最长主根的落点和树干中央叠出三个互相衔接的小堆，中央略厚、两端渐薄，所有上层像素都有下层承托；落叶会遮住根部末端，使树根逐渐埋入地面。它们使用当前叶片色板，但不参与照片密度、风摆动或动态落叶回收。树下方显示一个滚动增量计时器，以北京时间 `2020-09-26 00:00:00+08:00` 为起点，按总天数及 `day / h / m / s` 每秒更新；浏览器从后台恢复时会直接用 `Date.now()` 校正，不累积定时器漂移。

#### 照片活跃度如何控制叶片

服务端的 `getPhotoActivityStats()` 只读取最新一条 `status = ready` 的 `photo_entries.created_at`；尚未完成或已经取消的上传草稿不会刷新树叶密度。服务端只向浏览器传递距最后一次成功上传的天数、`0～1` 密度值和状态，不传递照片 URL、标题、位置或其他照片内容，也不再执行最近 30 天上传次数查询。旧数据库尚无 `status` 字段时会自动回退到原查询方式。

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

控制面板和入口按钮默认都不显示。需要临时调试时，登录后打开浏览器开发者工具，在 Console 输入以下命令并回车：

```text
open_tree_control_panel
```

命令只影响当前页面：点击面板右上角的收起按钮或刷新页面后会重新隐藏，不写入 `localStorage`。打开后可调整：

- 照片活跃度自动驱动、手动叶片密度；
- seed、分枝深度、树冠宽度、树干粗细；
- 风力、风速、阵风、落叶率、重力、横向漂移；
- 默认雾白，以及春绿/秋金/夜蓝色板、像素倍率和播放/暂停。

结构参数使用 170ms 防抖重建，其他参数实时生效。“随机”只更换 seed，“恢复默认值”恢复项目默认配置。设置保存在当前浏览器的 `private-tree-controls:v2` 中；其中不保存照片统计、Cookie、Session 或 Token。删除该 localStorage key 即可清除本机自定义值。旧存储数据中的 `leafSize` 会被自动忽略，叶片始终由生成算法完成 3px/2px/1px 分层。

需要不上传照片而从当前时刻重新开始树叶周期时，可在 Console 输入 `refresh_tree`。它会立即切回自动活跃度、将树冠恢复到 100%，并在当前浏览器保存 `private-tree-refreshed-at:v1`：前 21 天保持茂盛，第 21～40 天继续使用同一条三次衰减曲线。新的真实照片上传时间如果更晚，会自动取代这次本地刷新。该命令不会写数据库、伪造照片记录，也不会重置树下从 2020-09-26 开始的纪念计时器。

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

1. 如有封面，将安全的英文文件名图片复制到 `${PROJECT_COVER_STORAGE_ROOT}/projects/`。
2. 在 `src/data/projects.ts` 的 `projects` 数组中添加一个对象。
3. 数组顺序就是首页顺序；临时隐藏时设置 `published: false`。

示例：

```ts
{
  id: "project-name",
  title: "Project name",
  description: "Short description",
  coverFile: "project-name.webp",
  tags: ["Next.js", "Design"],
  projectDate: "2026-01 - 2026-08",
  projectUrl: "https://example.com",
  githubUrl: "https://github.com/example/repo",
  paperUrl: "https://example.com/paper.pdf",
},
```

多媒体作品将 `coverFile` 改为数组即可；图片和视频会按照数组顺序同时铺成全宽纵向画廊。图片保持原始长宽比，所有媒体左右边缘对齐；单项仍可直接使用字符串：

```ts
coverFile: ["project-name-01.webp", "project-name-02.webp", "project-name-03.webp"],
```

使用 B 站视频作为封面时，直接填写完整视频地址；首页会嵌入官方外链播放器，无需把视频复制到服务器：

```ts
coverFile: "https://www.bilibili.com/video/BV1xxxxxxxxx/",
```

图片和视频也可以混合排列：

```ts
coverFile: [
  "project-name-01.webp",
  "https://www.bilibili.com/video/BV1xxxxxxxxx/",
  "project-name-02.webp",
],
```

数组最多 8 项；`b23.tv` 短链和其他视频网站暂不支持。

完整字段、封面复制命令、草稿和校验说明见 [`docs/Works.md`](docs/Works.md)。修改作品元数据后需要重新构建并部署。

### 添加 Article

先执行 `202609030001_articles.sql` 和 `202609030002_article_covers.sql`，运行 `npm run hash-article-password`，配置 `ARTICLE_PUBLISH_PASSWORD_HASH` 与持久化的 `ARTICLE_COVER_STORAGE_ROOT`。打开 `/articles/new`，选择 JPEG/PNG/WebP 封面，填写标题、摘要、标签和 Markdown 正文，确认预览后输入原密码发布。封面 URL 保存到数据库，图片写入服务器 `articles/` 子目录；首页自动展示最新 6 篇文章的封面、标题、日期和标签。

原始 HTML 默认不会执行。完整字段、Markdown、密码安全、Migration、部署和故障排查见 [`docs/Articles.md`](docs/Articles.md)。

### 添加 Photo

先依次执行 `202608190001_photo_local_gallery.sql` 和 `202609050001_photo_groups_and_images.sql`，再登录打开 `/yfxl99/photos`，点击右下角“+”。每组可上传 1–12 张 JPEG/PNG/WebP，单张上限 10MB、单组上限 60MB；保存后可在修改面板继续添加、替换或删除组内图片。可填写标题、描述、中文地区、北京时间和最多 20 个标签。

```text
POST /api/private/photos/uploads/init
  → 验证 Session、同源、限流、字段和图片声明
  → 创建 draft 记录与 photos/{photoId}/{photoId}.{ext} 路径
PUT /api/private/photos/uploads/{photoId}
  → 复验草稿归属、MIME、字节数、文件签名和真实尺寸
  → 原子写入 PHOTO_STORAGE_ROOT
POST /api/private/photos/uploads/complete
  → 再次从磁盘复验，成功后发布为 ready
```

页面进入后直接显示画廊，没有额外页头。普通卡片在当前断点内等宽，高度严格使用原图比例，完整显示而不裁切；点击翻面查看时间、地点与标签，长按 450ms 在画廊内原位展开。展开卡桌面约占两列、手机占满宽度，周围卡片通过 FLIP 动画让位；切换目标时先收起旧卡再展开新卡。详情中的“评论”会在描述下方展开与 Food 相同的时间旁注，显示发布账号，单条正文最多 1000 字。展开后可以修改文字资料或删除整条照片与图片；删除照片时数据库会级联删除关联评论。左下角“统计”展示照片数、地区、标签、最近十二个月和往年今日。

旧 Supabase 照片继续使用短期 Signed URL。新本地图片通过 Session 鉴权的 `/api/private/photos/images/{id}/file` 读取；数据库仍只保存 `photos/...` 相对路径。完整约定、部署顺序和验收清单位于 `Photos.md`。

主要实现文件：

```text
src/app/yfxl99/(protected)/photos/page.tsx
src/app/api/private/photos/
├── entries/[id]/comments/route.ts
src/components/private/photos/
src/components/private/PrivateCommentSection.tsx
src/lib/photo/
src/services/photoService.ts
supabase/migrations/202608190001_photo_local_gallery.sql
supabase/migrations/202609050001_photo_groups_and_images.sql
supabase/migrations/202609010003_photo_comments.sql
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

Food 页面不显示额外标题文案，进入后直接展示画廊。组内每张图都作为独立的圆角卡片连续显示，使用克制的土色、留白和浅阴影，不使用渐变或毛玻璃堆叠。小卡片的列宽由当前网页宽度和响应式列数统一决定，高度严格按照每张原图的宽高比生成，不裁切横图或长图；瀑布流使用 1px 高度步进，把视觉间距留在图片容器之外。点击卡片以非线性动效翻面，查看分类、地点和北京时间；按住 450 ms 后，当前卡片直接在画廊网格中扩大到约两列宽，完整图片与资料并排显示，并通过 FLIP 布局动画把其他卡片推向旁边或下方，不再打开详情 Dialog。收起时普通卡片会立即取回自身原始网格高度；已有卡片展开时再展开另一张，会先完整收起前一张，再开始放大后一张，避免两张卡片直接互换。手机上展开卡片占满画廊宽度，图片在上、资料在下，页面保持正常滚动。详情中的“评论”会在点评下方展开按时间排列的餐桌旁注，显示发布账号，单条正文最多 1000 字。展开卡片中的“修改”可更新整组分类、中文地点、北京时间、评分和点评，不替换图片；“删除”经不可恢复确认后删除整组及全部图片，并由数据库级联删除关联评论。删除时先把组切到隐藏的 `draft` 状态，再按实际来源清理精确本地文件或旧 Storage 对象并级联删除数据库行；文件清理失败会尝试恢复 `ready`，数据库末步失败则保留隐藏草稿供旧草稿清理流程继续处理。左下角“统计”按组计算记录、分类、地点、评分和时间线，只有“照片数”按图片计算，因此多图组只增加一条记录。

主要实现文件：

```text
src/app/yfxl99/(protected)/food/page.tsx
src/app/api/private/food/
├── groups/[id]/route.ts
├── groups/[id]/comments/route.ts
├── images/[id]/file/route.ts
├── images/[id]/url/route.ts
├── uploads/{init,complete,cancel}/route.ts
└── uploads/[groupId]/[imageId]/route.ts
src/components/private/food/
├── FoodExperience.tsx
├── FoodGallery.tsx
├── FoodCard.tsx
├── FoodExpandedCard.tsx
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

- Photo/Food 使用 UUID 文件名；Project 封面可使用唯一、易读的安全英文文件名；均支持 `.jpg`、`.jpeg`、`.png`、`.webp`；
- 不使用原始相机名或中文名；
- Project 的图片 `coverFile` 写一个文件名或文件名数组，实际文件均位于 `PROJECT_COVER_STORAGE_ROOT/projects/`；若填写完整 HTTPS B 站视频链接，则使用 B 站外链播放器，不占用服务器磁盘；
- 新 Photo 数据库路径必须为 `photos/{photoId}/{photoId}.{extension}`，实际文件位于 `PHOTO_STORAGE_ROOT` 下的同名相对路径；旧 `photos/YYYY/MM/` 路径仅为 Supabase 兼容；
- 新 Food 数据库路径必须为 `food/{groupId}/{imageId}.{extension}`，实际文件位于 `FOOD_STORAGE_ROOT` 下的同名相对路径；旧 `food/YYYY/MM/` 路径仅为 Supabase 兼容；
- 删除 Photo/Food 时同时删除数据库行和对应本地文件或 Storage object，避免孤儿文件；
- `src/lib/project/local-storage.ts`、`src/lib/photo/local-storage.ts` 与 `src/lib/food/local-storage.ts` 负责各自根目录配置和路径越界防护；Project 封面由公开 API 流式读取，Photo/Food 继续使用受 Session 保护的接口；`src/lib/supabase/storage.ts` 负责旧 Photo/Food 的 Signed URL 和对象兼容。

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
  → POST /api/private/register（账号 + 密码 + 邀请码，仅首次）
  → 原子创建账号并消耗邀请码，自动登录
  → POST /api/private/login（后续使用账号 + 密码）
  → bcrypt hash verification + rate limit
  → signed HttpOnly/SameSite=Lax cookie
  → protected Server Component
  → session verification
  → server-only Supabase service-role client
  → PostgreSQL metadata
  → Photo/Food local authenticated file response or legacy Storage Signed URL
```

当前限流器按实例内存和请求 IP 工作，适合第一阶段与单实例部署；多实例、高流量公网部署应换成 Upstash/Redis 等共享存储限流器。反向代理必须可信地覆盖 `X-Forwarded-For`。

## Tools 故事编辑器

完整的模块注册信息、存储路径和删除边界见 [`docs/Tools.md`](docs/Tools.md)。

公开导航的 `/tools` 是模块卡片目录；每张卡片从服务端模块注册表读取标题、署名、分类和说明，点击后才进入 `/tools/{module}` 详情页。当前“剧情卡工作台”署名为张紫轩，其独立代码位于 `tool-modules/story-editor/index.html`，原编辑器的 Firebase SDK 与配置已经移除。故事数据经同源 API 原子写入 `TOOLS_STORAGE_ROOT/story-editor/data.json`；多个页面每 3 秒检查一次更新，不需要数据库 Migration。

编辑器代码、数据、目录卡片和宿主页面彼此分离。模块详情页的“删除模块”使用项目指定的明文口令进行服务端比较，客户端构建不包含口令；接口同时执行同源校验和按 IP 限流。口令正确后会先清空独立数据目录并写入停用标记，再尝试只删除 `tool-modules/story-editor/`，目录页也会自动移除对应卡片。在源码目录可写的 Node/CVM 部署中代码目录会被物理删除；在只读或不可变部署中，停用标记仍会立即阻止详情页、受控编辑器路由和数据 API 访问，下一次部署时再从构建源移除代码即可。

## 部署

### Vercel

公开页面仍可部署到 Vercel，但当前 Project 封面和 Photo/Food 新上传依赖持久磁盘，不能使用 Vercel 函数的临时文件系统保存。若要在 Vercel 显示封面并运行完整 Photos/Food 功能，需要另行接入对象存储；当前推荐部署到带持久云硬盘的腾讯云 CVM。

### 腾讯云 CVM

1. 将一块持久云硬盘挂载到固定位置，例如 `/data`；
2. 创建 `/data/mypage`，确保运行 Node.js 的系统用户拥有读写权限；
3. 在生产环境设置 `PROJECT_COVER_STORAGE_ROOT=/data/mypage/public-assets`、`ARTICLE_COVER_STORAGE_ROOT=/data/mypage/public-assets`、`PHOTO_STORAGE_ROOT=/data/mypage`、`FOOD_STORAGE_ROOT=/data/mypage` 与 `TOOLS_STORAGE_ROOT=/data/mypage/tools`；媒体与 Tools 数据分别写入各自子目录；
4. 如果使用 Docker，把宿主机持久目录挂载到容器内相同的配置路径；
5. 配置 Supabase、Articles 密码和 Session 环境变量，按顺序执行全部 Migration，并创建第一个邀请码；
6. 使用 HTTPS 反向代理运行 `npm start`，并定期备份 `/data/mypage`。

以后更换磁盘位置时，修改对应存储根目录并把原目录内容完整复制到新目录；Works 的 `coverFile` 以及数据库内的 `photos/...`、`food/...` 相对路径不需要修改。

### Node Server

```bash
npm install
npm run build
npm start
```

生产环境应置于 HTTPS 反向代理后。`NODE_ENV=production` 时 Session Cookie 使用 `Secure` 和 `__Host-` 前缀，因此 HTTPS 是必需的。
Node 进程必须能读取 `PROJECT_COVER_STORAGE_ROOT`，并对 `ARTICLE_COVER_STORAGE_ROOT`、`PHOTO_STORAGE_ROOT`、`FOOD_STORAGE_ROOT` 和 `TOOLS_STORAGE_ROOT` 拥有持续读写权限。不要把生产路径设在源码目录、`.next`、系统临时目录或容器未挂载的可写层中。若希望删除按钮同时物理删除编辑器代码，Node 进程还需对部署目录中的 `tool-modules/story-editor/` 有删除权限；否则会采用上面的停用标记降级路径。

## 验收清单

- [ ] 将 `.env.example` 复制为 `.env.local` 并填写真实值
- [ ] 按顺序执行全部 migration，确认 `articles.cover_url`、`private_users`、`private_invites`、升级后的 `photo_entries`、`food_entries`、`food_images`、`food_comments`、`photo_comments` 与两个 Buckets
- [ ] 用 `npm run hash-article-password` 生成 bcrypt 哈希，在 `.env.local` 配置 `ARTICLE_PUBLISH_PASSWORD_HASH`，确认发布页能写入 Markdown 文章
- [ ] 确认 `private-diary` 为 Private，所有私密表匿名查询失败
- [ ] 将 `PROJECT_COVER_STORAGE_ROOT` / `ARTICLE_COVER_STORAGE_ROOT` / `PHOTO_STORAGE_ROOT` / `FOOD_STORAGE_ROOT` 指向持久磁盘，确认 Node 进程权限并配置目录备份
- [ ] 将 `TOOLS_STORAGE_ROOT` 指向持久磁盘，并确认 Tools 删除后的停用标记可持续保存
- [ ] 用 `npm run generate-invite` 生成高熵邀请码，只把摘要写入 `private_invites`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] 未登录访问 Photos/Food 会重定向
- [x] Food API 未登录返回 401、跨站写入返回 403、超大 JSON 返回 413
- [x] Food 桌面/手机瀑布流、翻面、长按原位展开、统计、图片选择和上传弹窗通过 Chrome 验收
- [x] Photos 画廊保持原图比例，长按原位展开、关闭复位、顺序切换和移动端布局通过 Chrome 验收
- [ ] 邀请码注册、重复邀请码拒绝、账号密码登录、限流和 Logout 行为符合预期
- [ ] 新上传 Photo/Food 显示当前账号，历史记录保持无署名
- [ ] Food/Photo 详情可以读取、发布评论，评论显示当前账号且跨站写入被拒绝
- [x] 浏览器源码与静态 Bundle 中不存在明文密码或 Server Secrets

Supabase、生产 Secret 和持久磁盘步骤需要项目所有者在自己的 Dashboard 与部署环境中完成；Food/Photos、账号和评论的增量 Migration 与两个存储根目录都不能遗漏。

## `/yfxl99` 动画与性能审查（2026-08-19）

本次只审查和修改 `/yfxl99` 登录页、Welcome 像素树、Food、Photos 及其共用私密导航/Loading/Error 边界，没有改变公开页面、认证、数据库结构、图片路径或正式数据。

- 新增 `src/lib/motion.ts`，统一 160ms 触控反馈、300ms 常规过渡、420ms 布局动画和快速收尾缓动。
- Food / Photos 卡片 FLIP 支持动画中断续接；旧卡先收起、再展开新卡的既有规则保持不变。合成层提示只在播放时存在，结束后自动清理。
- 卡片悬停移除了高成本的动态阴影；长按增加即时压感，触摸滑动仍会取消长按。统计面板现在能平滑开合，上传/修改 Dialog 具有进入和退出动画。
- 像素树移除了逐帧叶片复制、排序、色板数组创建与 GPU buffer 重建；可见叶片和粒子改为复用类型数组及 `bufferSubData`。
- Reduced Motion 现在覆盖 CSS、FLIP、原生平滑滚动和 WebGL RAF，并实时响应系统偏好变化。
- production Chrome 验收覆盖桌面与 390×844、DPR 2：Food 连续切卡、Food 统计、Photo 展开、满叶树的 P95 帧间隔约 16.8–17.1ms，所有样本都没有超过 25ms 的帧；运行时错误为 0，动画结束后的活动 `will-change` 为 0。
- 浏览器验收使用临时本地 SVG 假图和临时公开预览入口；验收完成后两者以及 Chrome 配置、服务器进程均已删除，没有连接或修改正式数据库、现有照片与 `.env.local`。

## 验证记录

- 交付机原本没有 Node.js；使用未安装到系统的官方便携版 Node.js `22.23.2` 完成验证，并生成 `package-lock.json`。
- `npm run lint`：通过，0 error / 0 warning。
- `npm run typecheck`：通过，TypeScript strict 无错误。
- `npm run build`：通过；首页、文章编辑页和 Resume 静态生成，Articles 列表/详情/sitemap 按请求读取数据库，私密页面/API 动态渲染，Proxy 生效。
- 历史共享密码版曾完成 Production 冒烟；切换到账号版后，生产构建已通过，但注册、邀请码消耗和上传署名仍需在执行第四份 Migration 的目标环境中按上方验收清单复核。
- Rate Limit：同一客户端连续 6 次错误请求状态为 `401, 401, 401, 401, 401, 429`。
- 静态安全扫描：账号密码与 Session Secret 不存在于源码；Tools 删除口令按需求仅存在于 server-only 注册表，扫描 `.next/static` 浏览器文件未发现该口令或 server-only 环境变量名。
- 视觉抽查：使用 production build 检查了 1440px 桌面和 500px 小屏布局，导航、排版与响应式断点正常。
- 像素树浏览器验收：登录后在 Chrome WebGL2 环境检查 1440×960 与 390×844；100% 手动密度下确认大树冠、缩短的裸露树干和 3px/2px/1px 叶片层次，shader 无运行时错误，桌面/手机均无页面溢出；控制面板可滚动、收起，树参数与 localStorage 持久化正常。面板入口现已改为默认完全隐藏，只能在 Console 输入 `open_tree_control_panel` 临时打开。
- 树形平衡验收：使用 production build 在 1440×960 Chrome WebGL2 中复核默认 seed；主干保持接近竖直，左右侧枝同高度成对展开，同时仍保留非镜像的自然差异，无运行时错误和页面溢出。
- 叶片时间曲线验收：纯函数边界与单调性通过；第 21、22、30、35、39、40 天密度分别约为 `100%`、`99.99%`、`89.37%`、`59.99%`、`14.97%`、`0%`，从未上传和统计不可用时为 `0%`。
- 固定落叶与计时器验收：production build 下分别检查 0% 和 100% 叶片密度；0% 时 165 个固定根部落叶仍使用当前叶片色板显示，树在 1440×960 与 390×844 画布中保持水平居中，Welcome 文案不存在；计时器连续采样均每秒前进，桌面/手机无溢出且 WebGL 无运行时错误。
- 增量时间纯函数验收：北京时间起点本身得到 `0 day 00 h 00 m 00 s`，增加 90,061 秒后准确得到 `1 day 01 h 01 m 01 s`。
- 像素树质量检查：`npm run lint` 与 `npm run typecheck` 通过；扫描 19 个 `.next/static` 文件，未发现明文密码、Password Hash、Session Secret 或 Service Role 变量名。
- Works 本地目录构建：首页构建不再访问 Supabase `projects`；作品元数据会在构建时校验，封面由运行时本地文件接口读取。
- Food 生产构建：`npm run typecheck`、`npm run lint`、`npm run build` 全部通过；构建产物包含组修改/删除、本地图片读取、图片来源刷新、上传 `init / per-file PUT / complete / cancel` 共七个动态 Food API 路由。
- Food Chrome 验收：用不进入正式代码的临时本地数据检查桌面与 390×844 手机；长按 520 ms 后卡片留在 `.food-gallery` 内原位展开，打开 Dialog 数为 `0`，相邻卡片位置发生变化，页面横向溢出为 `0`，浏览器运行时错误为 `0`。桌面展开约占两列，手机展开宽度与画廊同为 350px；圆角、同组切换、修改/删除入口和收起按钮均正常。
- Food 图片校验验收：上传弹窗读取本地 JPEG 后正确显示文件预览、`44KB` 与 `736×736` 尺寸；服务器文件头解析以真实 JPEG 及合成 PNG/WebP 头验证，三种格式均正确复验尺寸；没有发起外部上传。
- Food 修改验收：production Chrome 中长按展开卡片后确认“修改 / 删除”入口；桌面与 390×844 手机编辑弹窗无横向溢出或控制台错误。291 个地区候选均为纯中文，混合输入会过滤为中文，非中文地点 PATCH 返回 `400`；未提交修改或确认删除现有数据。
- Food 本地文件验收：使用独立临时根目录验证 `FOOD_STORAGE_ROOT` 生效、重复上传安全覆盖、限长读取、目录穿越拒绝和精确删除，测试结束后临时文件与目录均已清理；生产构建包含本地 PUT 与鉴权读取路由，且不再触发动态目录的全项目文件追踪警告。
- Food API 安全冒烟：未登录页面 `307 → /yfxl99`，未登录 API `401`，携带有效本地测试 Session 的跨站 POST `403`，同源非法字段 `400`，超过 64KB 的 JSON `413`，有效 Session 页面 `200`。
- Food 本地路由冒烟：独立 production server 中，本地图片读取路由和逐文件 PUT 路由在没有 Session 时均返回 `401`；测试服务器已停止，没有残留监听端口。
- Food 静态安全扫描：扫描 21 个 `.next/static` 文件，未发现 `SUPABASE_SERVICE_ROLE_KEY`、密码 Hash、Session Secret 的变量名或实际值。
- 未对正式数据库执行真实 Food 写入或删除：现有数据没有被修改。项目所有者仍需执行第二份 Migration，并在最终 `FOOD_STORAGE_ROOT` 上上传一组多图，核对数据库相对路径、本地文件、旧 Supabase 图片回退与整组删除。
- Photos Chrome 验收：使用不进入正式路由的临时数据检查桌面与 390×844 手机。桌面为 4 列、手机为 2 列，页面横向溢出均为 `0`；普通卡片按真实尺寸保持 `1.5 / 0.667 / 1 / 2` 等原图比例。长按 520ms 后详情仍是 `.photo-gallery` 内的网格项，Dialog 数为 `0`；关闭后第一张恢复到 `1.5`，从“黄昏散步”切换到“窗边”时中间先出现旧卡已收起且新卡尚未展开的阶段，随后只展开新卡。手机展开宽度与画廊同为 350px，浏览器运行时错误为 `0`。
- 未对正式数据库执行真实 Photos 写入、修改或删除：已有照片和 `.env.local` 均未改动。项目所有者仍需执行第三份 Migration，并在最终 `PHOTO_STORAGE_ROOT` 上上传一张照片，核对数据库相对路径、本地文件、旧 Supabase 图片回退、修改与删除。
