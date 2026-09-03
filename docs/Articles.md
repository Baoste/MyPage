# Articles 数据库与发布说明

Articles 已从仓库内 Markdown 文件切换为 Supabase PostgreSQL。文章正文仍使用 Markdown，但标题、摘要、标签、正文和发布时间都保存在 `public.articles` 表中。浏览器不直接连接 Supabase；公开读取与密码保护的发布操作统一经过 Next.js 服务端。

## 1. 页面与数据流

| 路径 | 用途 |
| --- | --- |
| `/articles` | 按年份和日期展示数据库中的已发布文章；右下角“+”进入发布页 |
| `/articles/new` | 填写文章信息、编辑 Markdown、实时预览并输入发布密码 |
| `/articles/{slug}` | 渲染一篇已发布文章的 Markdown 正文 |
| `POST /api/articles` | 校验来源、大小、字段、限流和密码后写入数据库 |

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
  → POST /api/articles
  → 同源与 256 KiB 请求限制
  → 按客户端 IP 的密码尝试限流
  → ARTICLE_PUBLISH_PASSWORD 服务端校验
  → 字段二次校验
  → public.articles INSERT
  → /articles/{slug}
```

## 2. 执行数据库 Migration

Articles 依赖：

```text
supabase/migrations/202609030001_articles.sql
```

推荐在项目已关联 Supabase 后执行全部未应用 Migration：

```bash
npx supabase db push
```

也可以在 Supabase Dashboard 的 SQL Editor 中执行该文件。它会创建：

- `public.articles` 表；
- 唯一 `slug`、标题/摘要/正文长度和标签数量约束；
- 按 `published_at` 排序的已发布文章索引；
- 自动更新 `updated_at` 的 trigger；
- RLS 与权限收紧，只向 `service_role` 授予读取和新增权限。

Migration 依赖第一份初始 Migration 中的 `public.set_updated_at()`，因此全新数据库必须按照 `supabase/migrations/` 文件名顺序执行。

## 3. 配置发布密码

在服务器的 `.env.local` 中设置固定密码：

```dotenv
ARTICLE_PUBLISH_PASSWORD=替换为你自己的高强度密码
```

修改 `.env.local` 后必须重新启动 Next.js 进程。不要使用 `NEXT_PUBLIC_` 前缀，不要把真实密码写入 `.env.example`、源码或 Git。

密码只会随同源 `POST /api/articles` 请求发送到服务器，不会进入浏览器构建文件。服务端先把候选值和环境变量分别计算成固定长度 SHA-256 摘要，再使用时序安全比较。连续错误尝试按客户端 IP 限制为 15 分钟最多 5 次；当前限流保存在单个 Node 实例内存中，多实例部署需要换成 Redis 等共享限流存储。

生产环境必须使用 HTTPS，否则密码在浏览器与服务器之间的传输无法得到 TLS 保护。

## 4. 发表文章

1. 打开 `/articles`。
2. 点击页面右下角的圆形“+”按钮。
3. 填写标题、Slug、摘要和可选标签。
4. 在左侧 Markdown 编辑区编写正文，通过工具栏插入常用格式。
5. 在右侧预览区检查最终排版；窄屏设备上预览位于编辑区下方。
6. 输入 `.env.local` 中设置的发布密码。
7. 点击“发布文章”。

成功后页面会自动进入新文章详情。`/articles`、详情 metadata 和 `/sitemap.xml` 都会在后续请求中读取新数据，无需重新构建或部署。

## 5. 字段规则

| 字段 | 必填 | 限制 |
| --- | --- | --- |
| 标题 | 是 | 去除首尾空格后 1～160 字符 |
| Slug | 是 | 1～120 字符，只能使用小写字母、数字和单个连字符；必须唯一 |
| 摘要 | 是 | 去除首尾空格后 1～500 字符 |
| 标签 | 否 | 使用中文或英文逗号分隔；去重后最多 12 个，每个最多 32 字符 |
| Markdown 正文 | 是 | 去除首尾空格后 1～200,000 字符 |
| 发布密码 | 是 | 与服务器 `ARTICLE_PUBLISH_PASSWORD` 完全一致 |

Slug 会成为永久链接的一部分：

```text
https://你的域名/articles/rendering-notes
```

发布后当前界面不提供修改 Slug、编辑或删除功能，因此发布前应确认标题、Slug、摘要和预览结果。重复 Slug 会返回明确提示，不会覆盖已有文章。

## 6. Markdown 支持

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

## 7. 数据库字段

| 数据库字段 | 用途 |
| --- | --- |
| `id` | 自动生成的 UUID |
| `slug` | 唯一公开路径 |
| `title` | 标题 |
| `summary` | 列表、详情页和 metadata 摘要 |
| `content` | Markdown 原文 |
| `tags` | PostgreSQL `text[]` 标签数组 |
| `is_published` | 是否允许公开读取；发布接口固定写入 `true` |
| `published_at` | 列表排序与公开日期 |
| `created_at` | 数据库创建时间 |
| `updated_at` | trigger 自动维护的更新时间 |

公开页面只查询 `is_published = true` 的记录。数据库没有向 `anon` 或 `authenticated` 建立读写 Policy；所谓“公开读取”是由 Next.js 服务端读取后渲染公开 HTML，而不是允许浏览器持有数据库权限。

## 8. 旧 Markdown 文件

`content/articles/*.md` 已不再被运行时代码、文章列表、详情页或 sitemap 读取。原文件可以暂时保留作为迁移参考，但新增或修改这些文件不会再改变网站内容。

如需迁移旧文章，可以打开旧文件，把 frontmatter 中的标题、摘要、标签和文件名分别填入发布页，再把 frontmatter 下方的 Markdown 正文复制到编辑器。确认数据库文章正常显示并完成备份后，再自行决定是否删除旧文件。

## 9. 部署步骤

1. 部署包含 Articles 改动的新代码。
2. 在目标 Supabase 执行 `202609030001_articles.sql`。
3. 在生产服务器设置 `NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` 和 `ARTICLE_PUBLISH_PASSWORD`。
4. 重启 Node.js 服务，使环境变量生效。
5. 打开 `/articles/new` 发布一篇测试文章。
6. 检查 `/articles`、详情页、metadata 和 `/sitemap.xml`。

`SUPABASE_SERVICE_ROLE_KEY` 和发布密码都只能存在于服务器环境。不要把它们放进 `NEXT_PUBLIC_*` 变量，也不要从客户端直接调用 Supabase。

## 10. 常见问题

### 文章列表为空

检查 Supabase URL 和 service-role key 是否配置，并确认 `202609030001_articles.sql` 已执行。数据库未配置或表尚不存在时，列表会安全显示为空。

### 提示“文章发布密码尚未配置”

在实际运行 Next.js 的服务器环境中设置 `ARTICLE_PUBLISH_PASSWORD`，然后重启进程。只修改当前终端之外的文件而不重启服务不会生效。

### 提示“发布密码不正确”或 429

密码区分大小写，也不会自动去除用户输入中的空格。连续五次失败后，同一客户端需要等待最多 15 分钟。单实例重启会清空当前内存限流记录。

### 提示 Slug 已被使用

每篇文章必须使用唯一 Slug。修改为另一个只含小写字母、数字和连字符的值后重新发布。

### 发布成功但列表顺序不对

列表按数据库 `published_at desc, id desc` 排序，新发布文章应在最前。不要手动把 `published_at` 写成无效时间。

## 11. 主要实现文件

```text
src/app/(public)/articles/
├── page.tsx
├── new/page.tsx
└── [slug]/page.tsx
src/app/api/articles/route.ts
src/components/public/ArticleEditor.tsx
src/components/public/ArticleEditor.module.css
src/components/public/ArticlePublishButton.tsx
src/services/articleService.ts
src/lib/article-publish.ts
supabase/migrations/202609030001_articles.sql
```
