# `/yfxl99/calendar` AI 日历手账

> 当前状态：数据库、月/日接口、素材浏览、AI 生成、手账编辑与预览保存已经实现。部署前需执行 Calendar migration，并配置服务端 AI 环境变量。

## 产品规则

- 日历按月展示，可切换月份；Photo 与 Food 按 `Asia/Shanghai` 的本地日期聚合。
- 不为每一天预建数据库记录。只有首次生成或保存手账时，才创建当天的 `calendar_entries`。
- 有 Photo 或 Food 的日期格高亮；已有成品时优先显示扁平化 Preview。
- 点击有素材或手账的日期，弹出卡牌浏览当天 Photo、Food、图片及评论。
- 用户可取消不希望发送给 AI 的素材，并在每组 Photo/Food 内继续选择具体图片（最多 8 张），再填写最多 2000 字的补充要求。
- AI 根据选中图片、内容、评论和补充要求生成 Cover、手账文字及零张或多张贴纸。图片优先发送缩略图；缩略图不存在时回退发送原图。
- 生成结果先进入草稿编辑器。文字和贴纸可拖动，贴纸可缩放、旋转，并支持方向键移动；文字可切换项目本地 Aventa/Morganite 字体、颜色和对齐方式，也可调整文本框宽高、字号并开关默认文字阴影。
- 桌面端编辑弹窗的素材栏与编辑栏保持等高，两侧独立滚动；窄屏改为单列顺序浏览。
- 月历日期数字固定在格子左上角，使用较小字号且没有背景色；已有手账的日期可单独保存日期数字的本地字体和颜色。
- 再次点击已有手账的日期时默认只展示手账作品，下方提供“编辑”和“删除”；点击编辑后才进入素材与画布界面。
- 编辑画布、Cover 裁切区域、保存后的 Preview 和日历日期格共享 `CALENDAR_ENTRY_ASPECT_RATIO = 1`，始终为 `1:1`。

## 数据库

迁移文件：

- `supabase/migrations/202609040001_calendar_journal.sql`
- `supabase/migrations/202609040002_calendar_thumbnails.sql`

### `calendar_entries`

每个用户每天最多一条记录，唯一键为 `(owner_user_id, entry_date)`。保存：

- 日期、时区与 `draft / generating / ready / failed` 状态；
- 用户补充、AI 原始文字和最终文字；
- 实际使用的 Photo、Food、图片和评论快照 `source_manifest`；
- 使用归一化坐标的可编辑 `layout_json`；
- provider、模型、提示词版本、生成时间等 `generation_meta`；
- 安全的最近错误摘要及创建、更新时间。

### `calendar_assets`

保存 `cover / sticker / preview / thumbnail` 的资源元数据。文件使用现有私有存储，路径为：

```text
calendar/{ownerUserId}/{entryId}/{assetId}.{extension}
```

每条手账最多一个当前 Cover、Preview 和 Thumbnail，可有多张贴纸。Preview 为展示窗口使用的 1024×1024 PNG；Thumbnail 为月历格使用的 256×256 WebP。API Key 不进入数据库、布局、日志或浏览器响应。

## 接口

```text
GET    /api/private/calendar/month?month=YYYY-MM
GET    /api/private/calendar/days/YYYY-MM-DD
POST   /api/private/calendar/days/YYYY-MM-DD/generate
PUT    /api/private/calendar/entries/{id}
PUT    /api/private/calendar/entries/{id}/preview
DELETE /api/private/calendar/entries/{id}
GET    /api/private/calendar/assets/{id}/file
```

所有接口都验证 `/yfxl99` Session 和资源归属；写接口额外验证同源请求。数据库表启用 RLS，并撤销 `anon` / `authenticated` 的直接权限，仅由服务端 service role 访问。

## AI 配置

```dotenv
CALENDAR_AI_API_KEY=
CALENDAR_AI_BASE_URL=https://api.openai.com/v1
CALENDAR_AI_TEXT_MODEL=gpt-5.4-mini
CALENDAR_AI_IMAGE_MODEL=gpt-image-2
```

环境变量仅在服务端读取。未配置 Key 时，素材浏览和已有手账仍可使用，生成按钮会明确显示不可用状态。

## 添加手账字体

日历字体使用 `next/font/local` 从项目本地读取。推荐使用体积较小的 `.woff2` 文件，并确保字体授权允许网站使用。以新增 `MyFont.woff2` 为例：

### 1. 放置字体文件

```text
src/app/fonts/MyFont.woff2
```

### 2. 在根布局注册字体

编辑 `src/app/layout.tsx`：

```tsx
const myFont = localFont({
  src: "./fonts/MyFont.woff2",
  variable: "--font-my-font",
  weight: "400",
  style: "normal",
  display: "swap",
});
```

将字体变量加入 `<html>`：

```tsx
<html
  lang="zh-CN"
  className={`${aventa.variable} ${morganite.variable} ${myFont.variable}`}
>
```

如果一个字体包含多个字重，可将 `src` 写成数组，并为每个文件声明对应的 `weight` 和 `style`。

### 3. 加入布局字体白名单

编辑 `src/lib/calendar/contracts.ts`，把字体标识加入 `CalendarTextFont`：

```ts
export type CalendarTextFont =
  | "aventa"
  | "morganite"
  | "my-font";
```

同时更新 `parseCalendarLayout()` 中的字体白名单或规范化逻辑。服务端只接受白名单中的字体，不能直接信任客户端提交的任意字体名称。

### 4. 加入编辑器映射和选项

编辑 `src/app/yfxl99/(protected)/calendar/CalendarExperience.tsx`：

```ts
const FONT_FAMILIES: Record<CalendarTextFont, string> = {
  aventa: 'var(--font-aventa), "Microsoft YaHei", sans-serif',
  morganite: 'var(--font-morganite), "Microsoft YaHei", sans-serif',
  "my-font": 'var(--font-my-font), "Microsoft YaHei", sans-serif',
};
```

在字体选择框中增加：

```tsx
<option value="my-font">My Font</option>
```

### 5. 同步扁平化 Preview

编辑器保存时使用浏览器 Canvas 生成 Preview，因此还要在 `renderPreview()` 的字体变量映射中加入 `--font-my-font`。生成前应等待 `document.fonts.ready`，并从根元素读取字体变量：

```ts
await document.fonts.ready;
const family = getComputedStyle(document.documentElement)
  .getPropertyValue("--font-my-font")
  .trim();
context.font = `42px ${family}, "Microsoft YaHei", sans-serif`;
```

编辑器 DOM 和 Canvas Preview 必须使用同一个字体映射，否则保存后的日历缩略图可能与编辑画布不一致。字体名称储存在现有 `layout_json` 中，因此新增字体通常不需要数据库 Migration。

## 一致性约束

- 月视图的素材高亮动态聚合，不创建空记录。
- 服务端校验日期、来源数量、文字长度、资源归属及 `1:1` 布局结构。
- 重新生成先上传新资源，成功后再替换旧资源；失败时恢复原有成品与布局。
- 保存提交 `updated_at` 进行乐观并发控制，避免旧页面覆盖新布局。
- 月视图不重新组合 Cover、文字和贴纸，而是优先加载 256×256 WebP Thumbnail 并使用懒加载；旧记录没有 Thumbnail 时才回退到 Preview。资源内容随 ID 固定，可使用长期私有浏览器缓存。
