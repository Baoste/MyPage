# Works 添加与维护说明

首页的 Works 已完全改为本地代码目录：作品信息写在 TypeScript 文件中，封面保存在服务器本地磁盘。它不会读取 Supabase 的 `projects` 表，也不需要为作品配置数据库权限。

## 1. 当前架构

```text
src/data/projects.ts
        │ 作品信息与排列顺序
        ▼
src/lib/project/catalog.ts
        │ 构建时校验
        ▼
src/services/projectService.ts
        │ 隐藏草稿、生成封面地址
        ▼
首页 Works

PROJECT_COVER_STORAGE_ROOT/projects/*.webp
        │ 服务器本地封面
        ▼
/api/projects/covers/projects/*.webp
```

相关文件的职责：

- `src/data/projects.ts`：唯一的作品信息来源；数组顺序就是首页顺序。
- `src/lib/project/catalog.ts`：在开发和构建时检查 ID、日期、链接、标签和封面文件名。
- `src/services/projectService.ts`：过滤未发布作品，并将封面文件名转换为本地图片接口地址。
- `src/lib/project/local-storage.ts`：限制允许访问的目录、扩展名和文件大小。
- `src/app/api/projects/covers/[...path]/route.ts`：从服务器磁盘读取并返回封面。

Supabase 即使不可用，首页 Works 也能正常显示。Private 私密区域仍然按原来的方式使用 Supabase，不受这次修改影响。

## 2. 添加一个作品

### 第一步：准备封面

支持 `.jpg`、`.jpeg`、`.png` 和 `.webp`，单张不超过 10 MB。建议使用比例一致的 16:9 WebP 图片，并采用容易识别的英文文件名，例如：

```text
personal-knowledge-base.webp
```

封面更新后建议使用新文件名，避免浏览器和 CDN 继续显示旧缓存。

### 第二步：把封面复制到服务器本地目录

默认目录是：

```text
.data/public-assets/projects/
```

因此本地开发时可将图片放到：

```text
.data/public-assets/projects/personal-knowledge-base.webp
```

生产服务器建议在 `.env.local` 中设置一个持久化磁盘目录：

```dotenv
PROJECT_COVER_STORAGE_ROOT=/data/mypage/public-assets
```

对应的封面位置就是：

```text
/data/mypage/public-assets/projects/personal-knowledge-base.webp
```

Linux 示例：

```bash
mkdir -p /data/mypage/public-assets/projects
cp personal-knowledge-base.webp /data/mypage/public-assets/projects/
```

Windows PowerShell 示例：

```powershell
New-Item -ItemType Directory -Force .data/public-assets/projects
Copy-Item .\personal-knowledge-base.webp .data/public-assets/projects\
```

> 部署平台如果使用临时文件系统，重新部署后文件可能消失。生产环境必须把 `PROJECT_COVER_STORAGE_ROOT` 指向持久化磁盘或挂载卷。

### 第三步：编辑作品目录

打开 `src/data/projects.ts`，向 `projects` 数组添加一个对象：

```ts
{
  id: "personal-knowledge-base",
  title: "个人知识库",
  description: "一个用于整理笔记、灵感与资料的个人知识系统。",
  coverFile: "personal-knowledge-base.webp",
  tags: ["Next.js", "TypeScript"],
  projectDate: "2026-01 - 2026-09",
  projectUrl: "https://example.com",
  githubUrl: "https://github.com/your-name/project",
},
```

保存后，本地开发服务器会自动刷新。生产环境中的作品信息属于构建产物，所以修改 `src/data/projects.ts` 后需要重新构建并部署；单独替换磁盘上的图片不需要重新构建。

一个作品需要展示多张封面时，将 `coverFile` 写成文件名数组，最多 8 张：

```ts
coverFile: [
  "personal-knowledge-base-01.webp",
  "personal-knowledge-base-02.webp",
  "personal-knowledge-base-03.webp",
],
```

多图会显示为可左右滑动的轮播图，并在底部显示圆点导航；圆点也可以点击。只有一张图片时仍然显示普通单图，不出现轮播控件。数组顺序就是图片顺序。

如果作品更适合用视频展示，`coverFile` 也可以直接填写完整的 B 站视频地址：

```ts
coverFile: "https://www.bilibili.com/video/BV1xxxxxxxxx/?p=1",
```

首页会显示 16:9 的 B 站播放器，默认不自动播放，并提供“BILIBILI ↗”入口在新标签页打开原视频。视频不需要复制到 `PROJECT_COVER_STORAGE_ROOT`。

视频封面目前有以下限制：

- 支持 `https://www.bilibili.com/video/BV...`、`av...` 和 `https://player.bilibili.com/player.html?...` 完整链接；
- 不支持需要重定向才能识别视频编号的 `b23.tv` 短链，请先在浏览器打开短链，再复制地址栏中的完整 B 站视频地址；
- 一个作品只能填写一个视频链接，不能把视频链接放进图片数组，也不能与图片混合；
- 暂不支持其他视频网站，错误域名会在开发或构建时直接报错。

## 3. 字段说明

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 唯一 ID，只能使用小写英文、数字和连字符，例如 `personal-site`。 |
| `title` | 是 | 首页显示的作品标题。 |
| `description` | 否 | 作品简介。 |
| `coverFile` | 否 | 一个本地图片文件名、1–8 个图片文件名的数组，或一个完整的 HTTPS B 站视频链接。 |
| `tags` | 否 | 技术或主题标签数组。 |
| `projectDate` | 否 | `YYYY-MM - YYYY-MM` 格式的起止月份，开始月份不能晚于结束月份。 |
| `projectUrl` | 否 | 作品在线地址，必须以 `http://` 或 `https://` 开头。 |
| `githubUrl` | 否 | 源代码地址，必须以 `http://` 或 `https://` 开头。 |
| `published` | 否 | 默认为公开；设置为 `false` 时不在首页显示。 |

不要再填写数据库时代的字段，例如 `cover_path`、`sort_order`、`is_published`、`created_at` 或 `updated_at`。

## 4. 调整作品顺序

首页严格按照 `src/data/projects.ts` 中的数组顺序显示。要调整顺序，直接移动整个作品对象，不再设置 `sort_order`。

## 5. 暂时隐藏作品

在作品对象中加入：

```ts
published: false,
```

它仍保留在代码里，但不会出现在首页。删除这一行或改为 `true` 即可重新公开。

## 6. 不使用封面或链接

只有 `id` 和 `title` 是必填的。最小作品对象如下：

```ts
{
  id: "small-experiment",
  title: "一个小实验",
},
```

没有 `coverFile` 时，卡片会显示占位效果；没有链接时，不会显示相应按钮。

## 7. 修改作品

- 修改文字、标签、日期或链接：直接编辑 `src/data/projects.ts`，然后重新部署。
- 修改图片封面：上传一个新文件，更新 `coverFile`。建议使用新文件名以绕过缓存。
- 修改视频封面：直接替换 `coverFile` 中的完整 B 站视频链接，不需要上传视频文件。
- 只覆盖同名封面：无需重新构建，但客户端可能暂时命中旧缓存。

## 8. 删除作品

建议先设置 `published: false` 确认页面效果，再从数组中删除作品对象。封面文件不会自动删除；确认不再使用后，需要手动从服务器的 `projects` 目录移除。

## 9. 自动校验

`defineProjects(...)` 会在开发和构建期间检查：

- 作品 ID 是否符合格式且没有重复；
- 标题和描述是否包含意外的首尾空格；
- 图片封面是否只是安全文件名、列表是否超过 8 张、扩展名是否受支持且没有重复；
- 视频封面是否为受支持的完整 HTTPS B 站链接，且没有被放入图片数组；
- 项目时间是否为有效的 `YYYY-MM - YYYY-MM`，且开始月份不晚于结束月份；
- 链接是否为 HTTP/HTTPS 地址；
- 标签是否为空、重复或包含首尾空格。

添加作品后建议运行：

```bash
npm run typecheck
npm run build
```

如果数据有误，构建会直接报出对应作品和字段，避免把错误内容部署到线上。

## 10. 常见问题

### 首页没有显示新作品

检查 `published` 是否被设为 `false`，并确认生产环境已经使用最新代码重新构建、部署。

### 作品显示了，但封面是占位图

检查 `coverFile` 中每个文件名是否与磁盘上的文件完全一致，包括大小写和扩展名。也可以直接访问：

```text
/api/projects/covers/projects/你的文件名.webp
```

如果返回 404，说明当前服务器在配置的本地目录中没有找到文件。

### B站视频没有显示

确认 `coverFile` 使用的是 `https://www.bilibili.com/video/BV...` 形式的完整地址，而不是 `b23.tv` 短链。播放器内容来自 B 站，访问者的网络也必须能够加载 `player.bilibili.com`；若只希望避免外部依赖，请改用服务器本地图片封面。

### 如何修改首页排列顺序

移动 `src/data/projects.ts` 中的对象顺序即可。

### 修改图片后为何仍看到旧图

图片接口会使用浏览器缓存。最可靠的方式是给新版图片换一个文件名，并同步修改 `coverFile`。

## 11. 旧 Supabase Projects 数据

首页现在不会查询 `public.projects`，也不会从 Supabase Storage 的 `public-assets/projects/` 读取封面。原有表和文件可以暂时保留作备份；在确认不再需要且已经备份前，不建议直接删除。

这次改变只针对 Works。账号、邀请、Photo、Food、评论和其他 Private 数据仍可继续使用 Supabase。
