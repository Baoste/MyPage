# Articles 数据库与发布说明

Articles 已从仓库内 Markdown 文件切换为 Supabase PostgreSQL。文章正文仍使用 Markdown，标题、摘要、标签、正文、封面 URL 和发布时间保存在 `public.articles` 表中；封面图片本身保存在 Next.js 服务器的持久磁盘。浏览器不直接连接 Supabase；公开读取与密码保护的发布操作统一经过 Next.js 服务端。

## 1. 页面与数据流

| 路径 | 用途 |
| --- | --- |
| `/articles` | 按年份和日期展示数据库中的已发布文章；右下角“+”进入发布页 |
| `/articles/new` | 选择封面、填写文章信息、编辑 Markdown、实时预览并输入发布密码 |
| `/articles/{slug}` | 显示封面并渲染一篇已发布文章的 Markdown 正文 |
| `POST /api/articles` | 接收 multipart 表单，校验来源、大小、字段、封面、限流和密码后写入文件及数据库 |
| `GET /api/articles/covers/{filename}` | 从服务器持久磁盘公开读取文章封面 |

读取路径：

```text
Browser
  → Next.js Server Component
  → src/services/articleService.ts
  → server-only Supabase service-role client
  → public.articles
```

发布路径：

```text
/articles/new
  → multipart POST /api/articles
  → 同源、10 MB 封面与 256 KiB 文本限制
  → 按客户端 IP 的密码尝试限流
  → ARTICLE_PUBLISH_PASSWORD_HASH bcrypt 校验
  → 封面 MIME、10 MB 大小、文件签名和像素数校验
  → ARTICLE_COVER_STORAGE_ROOT/articles/{uuid}.{ext}
  → public.articles INSERT（保存站内 cover_url）
  → 数据库写入失败时删除刚写入的封面
  → /articles/{slug}
```

## 2. 执行数据库 Migration

Articles 依赖：

```text
supabase/migrations/202609030001_articles.sql
supabase/migrations/202609030002_article_covers.sql
```

推荐在项目已关联 Supabase 后执行全部未应用 Migration：

```bash
npx supabase db push
```

也可以在 Supabase Dashboard 的 SQL Editor 中按顺序执行这两个文件。它们会创建：

- `public.articles` 表；
- 唯一 `slug`、标题/摘要/正文长度和标签数量约束；
- 按 `published_at` 排序的已发布文章索引；
- 自动更新 `updated_at` 的 trigger；
- RLS 与权限收紧，只向 `service_role` 授予读取和新增权限。
- 可为空的 `cover_url` 字段及站内文章封面 URL 格式约束。

第二份迁移保持 `cover_url` 可为空，以兼容发布封面功能之前的旧文章；新发布接口会强制要求封面。在第二份迁移执行前，读取服务会自动回退到旧字段并给现有文章显示年份占位图，但不能发布带封面的新文章。Migration 依赖第一份初始 Migration 中的 `public.set_updated_at()`，因此全新数据库必须按照 `supabase/migrations/` 文件名顺序执行。

## 3. 配置发布密码

项目只保存发布密码的 bcrypt 哈希，不再把原密码放进环境变量。先在项目根目录运行：

```bash
npm run hash-article-password
```

命令会隐藏输入并要求确认，然后输出两种格式：

- `.env.local` 专用值已经把 `$` 写成 `\$`，直接复制整行即可；这是为了避免 Next.js 把 bcrypt 哈希中的 `$` 当成环境变量展开符。
- 部署平台环境变量使用没有反斜杠的原始哈希值。

本地示例（实际内容由命令生成）：

```dotenv
ARTICLE_PUBLISH_PASSWORD_HASH=\$2b\$12\$...
```

修改 `.env.local` 后必须重新启动 Next.js 进程。删除旧的 `ARTICLE_PUBLISH_PASSWORD`；不要使用 `NEXT_PUBLIC_` 前缀，也不要把原密码或真实哈希写入 `.env.example`、源码或 Git。

密码只会随同源 `POST /api/articles` 请求发送到服务器，不会进入浏览器构建文件。服务端使用成本因子 12 的 bcrypt 哈希验证，不保存或还原原密码；生成命令要求密码至少 8 个字符，bcrypt 输入不能超过 72 个 UTF-8 字节。连续错误尝试按客户端 IP 限制为 15 分钟最多 5 次；当前限流保存在单个 Node 实例内存中，多实例部署需要换成 Redis 等共享限流存储。

生产环境必须使用 HTTPS，否则密码在浏览器与服务器之间的传输无法得到 TLS 保护。

## 4. 配置封面存储

文章封面使用独立的可选环境变量：

```dotenv
ARTICLE_COVER_STORAGE_ROOT=/data/mypage/public-assets
```

实际文件位于：

```text
ARTICLE_COVER_STORAGE_ROOT/articles/{uuid}.jpg
ARTICLE_COVER_STORAGE_ROOT/articles/{uuid}.png
ARTICLE_COVER_STORAGE_ROOT/articles/{uuid}.webp
```

如果 `ARTICLE_COVER_STORAGE_ROOT` 为空，会依次回退到 `PROJECT_COVER_STORAGE_ROOT` 和开发目录 `.data/public-assets`。因此文章封面与作品封面可以共享同一个持久化根目录，但各自位于 `articles/`、`projects/` 子目录，不会混在一起。

生产环境必须把该变量指向持久磁盘，并保证运行 Next.js 的系统账号拥有读写权限。不要指向源码目录、`.next`、系统临时目录或容器未挂载的可写层；数据库只保存 `/api/articles/covers/{filename}` URL，迁移数据库不会备份图片文件，所以数据库和该目录必须分别备份。

## 5. 发表文章

1. 打开 `/articles`。
2. 点击页面右下角的圆形“+”按钮。
3. 填写标题并选择一张封面，页面会显示 16:10 裁切预览。
4. 填写摘要和可选标签；Slug 会在发布时由服务端随机生成。
5. 在左侧 Markdown 编辑区编写正文，通过工具栏插入常用格式。
6. 在右侧预览区检查最终排版；窄屏设备上预览位于编辑区下方。
7. 输入生成 `ARTICLE_PUBLISH_PASSWORD_HASH` 时使用的原密码。
8. 点击“发布文章”。

成功后页面会自动进入新文章详情。首页“精选文章”按 `published_at desc, id desc` 读取最新 6 篇；`/articles`、详情 metadata 和 `/sitemap.xml` 也会在后续请求中读取新数据，无需重新构建或部署。

## 6. 字段规则

| 字段 | 必填 | 限制 |
| --- | --- | --- |
| 标题 | 是 | 去除首尾空格后 1～160 字符 |
| 封面 | 是（新文章） | JPEG、PNG 或 WebP；最大 10 MB、最大 4000 万像素；服务端复验文件签名 |
| 摘要 | 是 | 去除首尾空格后 1～500 字符 |
| 标签 | 否 | 使用中文或英文逗号分隔；去重后最多 12 个，每个最多 32 字符 |
| Markdown 正文 | 是 | 去除首尾空格后 1～200,000 字符 |
| 发布密码 | 是 | 与 `ARTICLE_PUBLISH_PASSWORD_HASH` 对应的原密码完全一致；最多 72 个 UTF-8 字节 |

Slug 会成为永久链接的一部分，并由服务端使用随机 UUID 生成：

```text
https://你的域名/articles/7c7e21e8-1f36-4aca-ae9d-84eb7cae75bd
```

发布者不需要填写或维护 Slug。数据库唯一约束负责阻止重复；如果发生概率极低的 UUID 碰撞，服务端会自动重新生成，最多尝试三次。当前界面不提供文章编辑或删除功能，因此发布前仍应确认标题、摘要和预览结果。

旧文章的 `cover_url` 可以为空：首页会显示统一的年份占位图，详情页不显示封面。通过当前发布页创建的新文章必须选择封面。

## 7. Markdown 支持

编辑器和详情页共同使用 `react-markdown` 与 `remark-gfm`，支持常见 Markdown 以及 GFM：

- 标题、粗体、斜体、引用；
- 有序和无序列表；
- 链接；
- 行内代码和代码块；
- 表格、任务列表、删除线。

示例：

````markdown
## 小标题

这是 **重点内容**，也可以加入 [链接](https://example.com)。

- 第一项
- 第二项

```ts
const message = "hello";
```
````

没有启用 `rehype-raw`，因此 Markdown 中的原始 HTML 不会作为可执行 HTML 注入页面。

## 8. 数据库字段

| 数据库字段 | 用途 |
| --- | --- |
| `id` | 自动生成的 UUID |
| `slug` | 服务端随机生成的 UUID，用作唯一公开路径 |
| `title` | 标题 |
| `summary` | 列表、详情页和 metadata 摘要 |
| `cover_url` | 站内封面 URL；图片文件不进入数据库 |
| `content` | Markdown 原文 |
| `tags` | PostgreSQL `text[]` 标签数组 |
| `is_published` | 是否允许公开读取；发布接口固定写入 `true` |
| `published_at` | 列表排序与公开日期 |
| `created_at` | 数据库创建时间 |
| `updated_at` | trigger 自动维护的更新时间 |

公开页面只查询 `is_published = true` 的记录。数据库没有向 `anon` 或 `authenticated` 建立读写 Policy；所谓“公开读取”是由 Next.js 服务端读取后渲染公开 HTML，而不是允许浏览器持有数据库权限。

## 9. 旧 Markdown 文件

`content/articles/*.md` 已不再被运行时代码、文章列表、详情页或 sitemap 读取。原文件可以暂时保留作为迁移参考，但新增或修改这些文件不会再改变网站内容。

如需迁移旧文章，可以打开旧文件，把 frontmatter 中的标题、摘要、标签和文件名分别填入发布页，再把 frontmatter 下方的 Markdown 正文复制到编辑器。确认数据库文章正常显示并完成备份后，再自行决定是否删除旧文件。

## 10. 部署步骤

1. 部署包含 Articles 改动的新代码。
2. 在目标 Supabase 按顺序执行 `202609030001_articles.sql` 和 `202609030002_article_covers.sql`。
3. 在生产服务器设置 `NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` 和原始 bcrypt 值形式的 `ARTICLE_PUBLISH_PASSWORD_HASH`。
4. 设置 `ARTICLE_COVER_STORAGE_ROOT`，创建持久目录并授予 Node.js 进程读写权限。
5. 重启 Node.js 服务，使环境变量生效。
6. 打开 `/articles/new` 发布一篇带封面的测试文章。
7. 检查首页精选文章、`/articles`、详情页封面、metadata 和 `/sitemap.xml`。

`SUPABASE_SERVICE_ROLE_KEY` 和发布密码都只能存在于服务器环境。不要把它们放进 `NEXT_PUBLIC_*` 变量，也不要从客户端直接调用 Supabase。

## 11. 常见问题

### 文章列表为空

检查 Supabase URL 和 service-role key 是否配置，并确认两份 Articles Migration 均已执行。缺少 `cover_url` 字段时，读取会安全显示为空，发布接口会提示应先执行 Migration。

### 提示“文章发布密码尚未配置”

运行 `npm run hash-article-password`，把生成的值设置为实际运行 Next.js 的服务器环境中的 `ARTICLE_PUBLISH_PASSWORD_HASH`，然后重启进程。`.env.local` 使用带 `\$` 的格式，部署平台的环境变量使用原始 `$` 格式；格式错误也会被视为尚未配置。

### 提示“发布密码不正确”或 429

密码区分大小写，也不会自动去除用户输入中的空格。连续五次失败后，同一客户端需要等待最多 15 分钟。单实例重启会清空当前内存限流记录。

### 封面上传失败或返回 413/415

确认文件为真实 JPEG、PNG 或 WebP，大小不超过 10 MB，并且图片总像素不超过 4000 万。只修改文件扩展名不会通过服务端文件签名校验。

### 数据库中有 `cover_url`，但图片返回 404

数据库只保存 URL，不保存图片。检查 `ARTICLE_COVER_STORAGE_ROOT` 是否与上传时一致、磁盘是否持久挂载、文件是否随服务器迁移，并确认 Node.js 进程具有读取权限。

### 发布成功但列表顺序不对

列表按数据库 `published_at desc, id desc` 排序，新发布文章应在最前。不要手动把 `published_at` 写成无效时间。

## 12. 主要实现文件

```text
src/app/(public)/articles/
├── page.tsx
├── new/page.tsx
└── [slug]/page.tsx
src/app/api/articles/route.ts
src/app/api/articles/covers/[filename]/route.ts
src/components/public/ArticleEditor.tsx
src/components/public/ArticleEditor.module.css
src/components/public/FeaturedArticles.tsx
src/components/public/ArticlePublishButton.tsx
src/services/articleService.ts
src/lib/article-publish.ts
src/lib/article/local-storage.ts
scripts/hash-article-password.mjs
supabase/migrations/202609030001_articles.sql
supabase/migrations/202609030002_article_covers.sql
```
