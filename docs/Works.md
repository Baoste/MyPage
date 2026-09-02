# Works 添加与维护说明

## 1. 数据保存在哪里

首页作品由两部分组成：

```text
Supabase PostgreSQL
└── public.projects
    └── 保存标题、介绍、标签、日期、链接和封面相对路径

Supabase Storage
└── public-assets
    └── projects/
        └── 保存作品封面图片
```

数据库不保存图片文件，也不保存 Base64 或永久拼接好的完整 URL。页面读取 `projects.cover_path` 后，通过 `getPublicAssetUrl()` 生成公开图片地址。

`public-assets` 是公开 Bucket，任何人都可以读取其中的文件。不要将私密照片或包含敏感信息的图片作为作品封面上传。

## 2. 添加前检查

确保已经完成以下配置：

1. 已执行 `supabase/migrations/202608180001_initial_schema.sql`。
2. Supabase 中存在 `public.projects` 表。
3. Supabase Storage 中存在公开的 `public-assets` Bucket。
4. `.env.local` 已填写：

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

项目一旦检测到这两个 Supabase 变量，就会以数据库内容为准，不再显示 `src/data/projects.ts` 中的 Mock 作品。即使数据库中一条作品也没有，页面也只会显示空状态，不会自动回退到 Mock 数据。

## 3. 准备封面图片

封面支持：

- JPEG：`.jpg`、`.jpeg`
- PNG：`.png`
- WebP：`.webp`
- 单张最大 10MB

建议优先使用 WebP，并将图片压缩到适合网页加载的大小。推荐横向构图；当前首页以 `16:9` 画框展示封面，并使用 `object-cover` 填满画框，因此过高或过宽的图片边缘可能被裁切。

不要直接使用原始相机文件名、中文文件名或容易重复的名字。可以先在 Supabase SQL Editor 中生成 UUID：

```sql
select gen_random_uuid();
```

假设结果为：

```text
550e8400-e29b-41d4-a716-446655440000
```

图片文件名可以设为：

```text
550e8400-e29b-41d4-a716-446655440000.webp
```

## 4. 上传作品封面

在 Supabase Dashboard 中依次打开：

```text
Storage
→ public-assets
→ projects
```

如果 `projects` 文件夹不存在，可以在上传文件时创建。最终文件位置应类似：

```text
public-assets/projects/550e8400-e29b-41d4-a716-446655440000.webp
```

后面写入数据库的 `cover_path` 必须是 Bucket 内的相对路径：

```text
projects/550e8400-e29b-41d4-a716-446655440000.webp
```

不要填写以下形式：

```text
/projects/550e8400-e29b-41d4-a716-446655440000.webp
public-assets/projects/550e8400-e29b-41d4-a716-446655440000.webp
https://YOUR_PROJECT.supabase.co/storage/v1/object/public/...
```

路径不能以 `/` 开头，也不能包含 `../`。

封面不是必填项。如果暂时没有封面，将 `cover_path` 留空，首页会根据作品顺序显示几何占位图。

## 5. 通过 Dashboard 添加作品

在 Supabase Dashboard 中依次打开：

```text
Table Editor
→ projects
→ Insert row
```

填写字段：

| 字段 | 是否必填 | 示例 | 说明 |
| --- | --- | --- | --- |
| `id` | 否 | 留空 | 数据库自动生成 UUID |
| `title` | 是 | `个人知识库` | 1～160 个字符 |
| `description` | 否 | `用于整理文章与长期笔记的内容系统。` | 首页作品介绍 |
| `cover_path` | 否 | `projects/UUID.webp` | Bucket 内相对路径，不包含 Bucket 名 |
| `tags` | 否 | `Next.js`、`TypeScript` | PostgreSQL `text[]` 数组；在数组编辑器中逐项添加 |
| `project_date` | 否 | `2026-09-02` | `YYYY-MM-DD` 格式 |
| `project_url` | 否 | `https://example.com` | 在线作品地址，必须包含协议 |
| `github_url` | 否 | `https://github.com/name/repo` | 源码地址，必须包含协议 |
| `sort_order` | 是 | `10` | 数字越小越靠前；默认值为 `0` |
| `is_published` | 是 | `true` | 只有 `true` 才会出现在公开首页 |
| `created_at` | 否 | 留空 | 数据库自动填写 |
| `updated_at` | 否 | 留空 | 数据库自动填写，修改记录时自动更新 |

如果作品还没有准备好，可以先将 `is_published` 设为 `false`，作为草稿保存。匿名访问者无法读取未发布作品。

## 6. 通过 SQL 添加作品

SQL Editor 是最稳定、最容易复查的添加方式。封面上传完成后执行：

```sql
insert into public.projects (
  title,
  description,
  cover_path,
  tags,
  project_date,
  project_url,
  github_url,
  sort_order,
  is_published
) values (
  '个人知识库',
  '用于整理文章、图片和长期笔记的内容系统。',
  'projects/550e8400-e29b-41d4-a716-446655440000.webp',
  array['Next.js', 'TypeScript', 'Supabase'],
  '2026-09-02',
  'https://example.com',
  'https://github.com/your-name/project',
  10,
  true
);
```

没有封面或外部链接时使用 `null`：

```sql
insert into public.projects (
  title,
  description,
  cover_path,
  tags,
  project_date,
  project_url,
  github_url,
  sort_order,
  is_published
) values (
  '界面实验',
  '关于内容层级、留白与交互反馈的界面实验。',
  null,
  array['界面设计', '设计研究'],
  '2026-08-20',
  null,
  null,
  20,
  true
);
```

添加后可以用以下查询确认公开作品及其排序：

```sql
select
  id,
  title,
  cover_path,
  tags,
  project_date,
  sort_order,
  is_published
from public.projects
where is_published = true
order by sort_order asc, project_date desc nulls last;
```

## 7. 首页排序规则

首页按照以下顺序读取作品：

```text
1. sort_order ASC
2. project_date DESC
```

即：

- `sort_order` 越小，作品越靠前。
- 两个作品的 `sort_order` 相同时，日期较新的排在前面。
- 建议使用 `10、20、30` 这样的间隔编号，后续可以在中间插入 `15`，避免频繁修改所有作品。

示例：

| 作品 | `sort_order` | 显示位置 |
| --- | ---: | --- |
| 作品 A | 10 | 第一个 |
| 作品 B | 20 | 第二个 |
| 作品 C | 30 | 第三个 |

## 8. 查看首页结果

本地启动项目：

```bash
npm run dev
```

访问：

```text
http://localhost:3000/
```

生产首页设置了 300 秒重新验证时间。发布或修改作品后，线上页面最多可能需要约 5 分钟更新；本地开发环境通常刷新页面即可看到变化。

作品卡片会根据数据库内容显示：

- 编号。
- 封面或几何占位图。
- 标签。
- 标题。
- 描述。
- 项目日期。
- “查看项目”链接。
- “查看源码”链接。

只有相应 URL 存在时，操作按钮才会出现。

## 9. 修改作品

可以在 Table Editor 中直接编辑，也可以执行 SQL：

```sql
update public.projects
set
  title = '新的作品名称',
  description = '新的作品介绍。',
  sort_order = 5
where id = '作品记录的 UUID';
```

修改封面时：

1. 先将新图片上传到 `public-assets/projects/`。
2. 更新 `cover_path`。
3. 确认首页可以正常加载新封面。
4. 再删除不再使用的旧 Storage 文件。

数据库触发器会自动更新 `updated_at`。

## 10. 取消发布

暂时隐藏作品时不要删除记录，只需设置：

```sql
update public.projects
set is_published = false
where id = '作品记录的 UUID';
```

未发布作品不会被匿名用户读取，也不会出现在首页。重新发布：

```sql
update public.projects
set is_published = true
where id = '作品记录的 UUID';
```

## 11. 删除作品

数据库记录和 Storage 文件没有自动级联关系。删除数据库行不会自动删除封面文件。

推荐顺序：

1. 将 `is_published` 改为 `false`。
2. 确认首页不再显示该作品。
3. 删除 `public.projects` 中的记录。
4. 删除 `public-assets/projects/` 中不再使用的封面文件。

删除数据库记录：

```sql
delete from public.projects
where id = '作品记录的 UUID';
```

删除 Storage 文件前，确认没有其他作品仍引用相同的 `cover_path`。

## 12. 未配置 Supabase 时添加 Mock 作品

只有在没有配置公开 Supabase 变量时，首页才读取：

```text
src/data/projects.ts
```

可以临时增加：

```ts
{
  id: "mock-my-project",
  title: "个人知识库",
  description: "用于整理文章与长期笔记的内容系统。",
  tags: ["Next.js", "TypeScript"],
  projectDate: "2026-09-02",
  projectUrl: "https://example.com",
  githubUrl: "https://github.com/your-name/project",
  sortOrder: 10,
  isPublished: true,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

Mock 模式下没有 Supabase Public URL，因此仅在本地数据中填写 `coverPath` 不能让任意本地图片自动显示。需要正式封面时，推荐配置 Supabase 并使用前面的 Storage 流程。

## 13. 常见问题

### 首页显示 `00 Projects`

依次检查：

1. 记录的 `is_published` 是否为 `true`。
2. `.env.local` 是否指向添加记录的同一个 Supabase 项目。
3. 是否已经执行初始 Migration。
4. `projects` 表中是否确实存在已发布记录。
5. 线上页面是否仍处于 300 秒缓存周期内。

### 作品存在但封面显示占位图

依次检查：

1. `cover_path` 是否填写为 `projects/文件名.webp`。
2. 路径是否错误地包含了 `/`、Bucket 名或完整 URL。
3. 文件是否真的上传到了 `public-assets/projects/`。
4. `public-assets` 是否保持为 Public Bucket。
5. 文件扩展名、实际 MIME 是否为 JPEG、PNG 或 WebP。

### 添加了作品但顺序不正确

检查 `sort_order`。数值越小越靠前；相同数值才会继续比较 `project_date`。

### 点击按钮没有出现

“查看项目”需要非空的 `project_url`，“查看源码”需要非空的 `github_url`。填写 URL 时包含 `https://`。

## 14. 相关代码

```text
src/app/(public)/page.tsx                    首页入口与 300 秒重新验证
src/components/public/ProjectGallery.tsx    作品列表
src/components/public/ProjectCard.tsx       单个作品卡片
src/components/common/SafeImage.tsx         封面与缺图占位
src/services/projectService.ts              数据查询、排序与 ViewModel
src/lib/supabase/storage.ts                  Public Storage URL
src/data/projects.ts                         未配置 Supabase 时的 Mock
supabase/migrations/202608180001_initial_schema.sql
                                               projects、Bucket 与 RLS
```

