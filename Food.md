# `/yfxl99/food` 私密美食画廊实现任务

> 状态：需求文档已完善，尚未执行。
>
> 本轮只允许修改本文件。开始实现前，必须再次取得用户明确指令；不得提前修改页面、组件、API、数据库 Migration、Storage 或依赖。
>
> 执行时必须先阅读项目根目录的 `CODEX.md`、`AGENTS.md` 和 `README.md`，并保留现有密码登录、Session、私密路由、Navbar、Supabase RLS 与 Signed URL 安全边界。

## 1. 任务目标

把 `/yfxl99/food` 从基础三列 Food Grid 改造成一个适合长期记录共同饮食记忆的私密美食画廊。

核心体验：

- 首页直接展示所有已上传图片，而不是每组只显示一张封面。
- 图片保持不完全统一的长宽比，形成类似生活方式图片应用的紧凑瀑布流，但不得复制小红书的品牌、图标或具体界面。
- 单击卡片翻到背面，查看分类、地点与时间。
- 长按卡片打开沉浸式放大层，图片浮于画面之上，右侧展开完整资料和点评。
- 右下角提供新增按钮，支持一次建立一组记录并上传多张图片。
- 左下角提供统计按钮，在画廊上方展开具有纪念意义的数据统计。

页面仍属于私密区域。所有读取、上传和统计都必须经过服务器 Session 验证。

## 2. 当前项目基线

现有实现：

- 页面：`src/app/yfxl99/(protected)/food/page.tsx`
- 展示组件：`src/components/private/FoodGrid.tsx`
- 数据服务：`src/services/foodService.ts`
- 类型：`src/types/index.ts`
- Storage 封装：`src/lib/supabase/storage.ts`
- 初始数据库：`supabase/migrations/202608180001_initial_schema.sql`
- 私有 Bucket：`private-diary`

当前 `food_entries` 是“一条记录对应一个 storage_path”的结构，无法表达一组记录包含多张图片。本任务必须在新的增量 Migration 中演进数据模型，不能直接破坏或重写已经执行过的初始 Migration。

## 3. 数据概念与统计口径

### 3.1 美食组

一次提交产生一个“美食组”，包含稳定组 ID、用户输入的分类、国家/省州/市三级地点、发生时间、1～5 星评分、点评，以及一张或多张有独立 ID 的图片。

一组代表一次美食记录，不代表一张图片。

### 3.2 图片

每张图片：

- 拥有独立图片 ID；
- 关联唯一的美食组 ID；
- 保存独立 `storage_path`、排序、宽高、MIME、文件大小和可选拍摄时间；
- 在画廊中单独显示为一张卡片。

同组图片在画廊中连续排列，并遵循用户上传时的顺序。不得只展示组内第一张图片。

### 3.3 统计口径

- “记录数、分类数、地点排行、评分”按美食组计算，多传图片不能重复增加这些指标。
- “照片数”按图片记录计算。
- 时间统计使用美食组的最终发生时间，不使用数据库 `created_at`。
- 地点统计使用稳定地区代码；展示名称只用于界面，避免同一地点因文字写法不同被拆成多项。

## 4. 页面结构与视觉方向

保留 `PrivateNavbar`，页面主体依次为：

```text
PrivateNavbar
Food 简洁标题区
可折叠统计区（默认收起）
不等高图片画廊
左下：统计按钮          右下：新增按钮
翻转层 / 长按详情层 / 上传层
```

视觉要求：

- 延续私密区域温暖、安静、克制的 Editorial 风格。
- 图片是视觉主体，卡片正面不常驻标题、标签、阴影或复杂装饰。
- 避免大量渐变、发光、毛玻璃和过度圆角。
- 浮动按钮使用清晰的实色圆形、可见焦点和安全区间距，不遮挡 Navbar、卡片或手机底部手势区。
- 页面不得出现横向滚动。

## 5. 瀑布流画廊

### 5.1 布局

- 使用图片真实宽高计算卡片比例和 Grid 行跨度，优先采用保持 DOM 顺序的 CSS Grid，而不是破坏阅读顺序的纯 CSS Columns。
- 极端横图或长图的展示比例需要限制在合理范围，完整原图可在长按详情层查看。
- 建议列数：宽桌面 4 列、普通桌面/平板 3 列、手机 2 列；极窄屏幕可降为 1 列。
- 卡片间距紧凑但可区分，组与组之间不额外插入大标题。
- 初始排序为美食组发生时间倒序；同组图片按 `sort_order` 升序。

### 5.2 图片加载

- 图片来自服务器生成的短期 Signed URL，不保存永久公开 URL。
- 使用已保存的宽高预留比例，避免加载时产生明显布局跳动。
- 首屏图片可按需优先加载，其余图片懒加载。
- 图片失败时显示与卡片比例一致的轻量占位，并提供重试；不能让整个画廊崩溃。
- `alt` 至少包含分类和组内序号，例如“火锅，第 2 张，共 4 张”。

## 6. 单击翻转

### 6.1 行为

- 单击或键盘 `Enter` / `Space` 在正面和背面之间切换。
- 每张图片卡片独立保存翻转状态，同组其他图片不随之翻转。
- 正面只显示图片。
- 背面至少显示：分类、国家/省市地点、发生时间。
- 背面空间不足时使用紧凑排版，完整点评和评分仍放在长按详情层，不允许文字溢出卡片。

### 6.2 动画

- 使用 `perspective`、`transform-style: preserve-3d` 和 `backface-visibility` 实现真实双面卡片。
- 动画时长建议 420～560ms，缓动使用平滑的非线性 `cubic-bezier`；禁止 `linear`。
- 翻转期间卡片不能改变宽高，避免瀑布流跳动。
- `prefers-reduced-motion: reduce` 时取消 3D 旋转，改为即时切换或短淡入淡出。

## 7. 长按放大与详情层

### 7.1 手势判定

- 鼠标、触控和触控笔统一使用 Pointer Events。
- 按住约 450ms 且移动距离不超过 10px 时判定为长按。
- `pointerup`、`pointercancel`、页面滚动或移动超限立即取消计时。
- 长按成功后必须吞掉随后的单击，不能同时触发翻转。
- 正常纵向滑动画廊时不得误触长按。

### 7.2 桌面详情层

- 当前图片在页面中央偏左放大，保持原始比例并限制在可视区内。
- 右侧展开详情面板，显示分类、完整地点、发生时间、评分和点评。
- 同组存在多图时，提供缩略图或上一张/下一张按钮；切换只在该组内发生。
- 点击遮罩、关闭按钮或按 `Escape` 可关闭。

### 7.3 手机详情层

- 图片置于上方，详情改为底部抽屉，不能强行保留狭窄右栏。
- 抽屉内容超出时内部滚动；背景页面锁定滚动。
- 关闭按钮和图片切换按钮的触控区域不得小于约 44×44 CSS 像素。

### 7.4 可访问性

- 详情层使用语义正确的 Dialog，打开时把焦点移动到 Dialog，关闭时还给原卡片。
- 焦点限制在 Dialog 内，背景内容不可被键盘或读屏继续操作。
- 所有图标按钮都有中文可读名称，不只依赖图标表达含义。

## 8. 新增美食组

### 8.1 入口与容器

- 右下角固定一个 `+` 圆形按钮，标签为“新增美食记录”。
- 桌面端打开居中 Dialog 或右侧面板；手机端使用全高或接近全高的底部面板。
- 打开时保留未提交表单，只有用户明确取消才清空。

### 8.2 图片选择

- 一组至少 1 张、最多 12 张图片。
- 允许 JPEG、PNG、WebP；每张最多 10MB，与现有 Bucket 限制一致；第一版不处理 HEIC、GIF 和视频。
- 选择后立即生成本地预览，显示顺序、文件状态和删除按钮。
- 支持拖动或键盘按钮调整顺序；排序结果写入 `sort_order`。
- 单组总大小建议限制为 60MB，超过时在上传前明确提示。
- 原始文件名不得进入 Storage 路径，也不得直接作为页面文案显示。

### 8.3 表单字段

| 字段 | 要求 |
| --- | --- |
| 分类 | 必填、用户输入，去除首尾空白，1～40 字符 |
| 国家 | 必填、可搜索选择，保存代码与名称快照 |
| 省/州 | 依据国家显示；行政区没有该层级时允许为空 |
| 城市 | 必填、从对应行政区选择；特殊地区允许受控的手动补充 |
| 发生时间 | 必填，默认来自第一张图片的拍摄时间，否则为当前本地时间，允许手动修改 |
| 时区 | 随发生时间保存；EXIF 没有时区时按用户当前时区解释并提示 |
| 评分 | 必填，1～5 星，键盘可操作 |
| 点评 | 可选，多行输入，最多 2000 字符 |

地点选择器应使用封装的数据源和稳定代码。第一版不调用浏览器定位，也不上传 GPS 坐标。地区数据未覆盖的地点必须有明确的受控回退方式，不能让用户卡在表单中。

### 8.4 第一张图片拍摄时间

- 只读取当前排序第一张图片的 EXIF `DateTimeOriginal` 或等价拍摄时间。
- 如果读取失败、图片不含该信息或格式不支持，则使用用户当前日期时间。
- 在用户尚未手动修改时间时，更换或重新排序第一张图片可以重新自动填充。
- 用户一旦手动修改，后续图片排序不得覆盖该值，除非用户点击“重新读取”。
- 不读取、不上传、不保存 EXIF GPS、设备序列号等无关信息。

### 8.5 表单状态

- 图片解析、校验、上传和最终保存必须显示独立状态。
- 每张图片显示上传进度和失败原因，失败项允许单独重试。
- 提交期间防止重复提交；关闭面板前若存在未提交内容，应二次确认。
- 成功后关闭面板、刷新服务端数据，并把新组图片插入正确时间位置。

## 9. 数据库设计

### 9.1 目标类型

```ts
interface FoodGroup {
  id: string;
  category: string;
  review?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  occurredAt: string;
  timezone: string;
  location: {
    countryCode: string;
    countryName: string;
    regionCode?: string;
    regionName?: string;
    cityCode?: string;
    cityName: string;
  };
  images: FoodImage[];
  createdAt: string;
  updatedAt: string;
}

interface FoodImage {
  id: string;
  foodGroupId: string;
  storagePath: string;
  sortOrder: number;
  width: number;
  height: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  byteSize: number;
  capturedAt?: string;
}

interface FoodImageViewModel extends FoodImage {
  imageUrl: string;
}

interface FoodGroupViewModel extends Omit<FoodGroup, "images"> {
  images: FoodImageViewModel[];
}
```

数据库 Entity 不保存 `imageUrl`；它只存在于经过鉴权后生成的服务器 ViewModel 中。

### 9.2 表结构方向

`food_entries` 演进为组级表，至少保存：

- `id`
- `category`
- `review`
- `rating`
- `occurred_at`
- `timezone`
- 国家、省/州、市的代码与名称快照
- `status`（`draft` / `ready`）
- `created_at` / `updated_at`

新增 `food_images`，至少保存：

- `id`
- `food_entry_id`，外键指向 `food_entries(id)`，删除组时级联删除数据库图片记录
- `storage_path`，全表唯一
- `sort_order`
- `width` / `height`
- `mime_type` / `byte_size`
- `captured_at`
- `created_at`

约束：

- 评分只能为 1～5。
- 宽高和文件大小必须为正数。
- 同组 `sort_order` 唯一且非负。
- `storage_path` 禁止绝对路径和 `..`，并必须位于该组的 `food/{groupId}/` 前缀下。
- 画廊与统计查询只返回 `status = 'ready'` 的组；草稿不能进入画廊和统计。
- `food_entries` 与 `food_images` 都启用 RLS，继续不为 anon/authenticated 创建读写策略。

### 9.3 旧数据迁移

- 新建独立的时间戳 Migration，不修改 `202608180001_initial_schema.sql`。
- 现有每条 `food_entries.storage_path` 迁移为对应组的第一条 `food_images` 记录。
- 现有 `name` 可回填为 `category`，`description` 回填为 `review`，`location` 保留为旧地点快照，`food_date` 转换时不得丢失原日期。
- 现有 `restaurant` 和 `tags` 暂时保留为兼容字段，不在本任务中擅自删除历史信息。
- 先完成回填并校验数量，再把旧 `storage_path` 标记为兼容/弃用字段；不得在同一步无备份删除旧数据。
- Migration 必须可在“已有旧数据”和“全新数据库”两种情况下执行。

## 10. Storage 与上传事务

### 10.1 路径

所有原图保存到私有 Bucket `private-diary`：

```text
food/{groupId}/{imageId}.{extension}
```

- `groupId` 与数据库美食组 ID 相同。
- `imageId` 与 `food_images.id` 相同。
- 扩展名由服务器根据允许的 MIME 类型确定，不信任原文件名。
- Bucket 必须保持 Private，不增加公开读取 Policy。

### 10.2 推荐上传流程

为避免多张大图经过单个 Next.js 请求造成部署平台 Body 限制，采用受控的分阶段上传：

1. 客户端完成预览、EXIF 时间读取和基础校验。
2. `POST /api/private/food/uploads/init` 验证 Session、同源请求、表单与文件描述，服务器生成组 ID、图片 ID、Storage 路径和短期 Signed Upload Token，并建立 `draft`。
3. 浏览器凭每张图片专用、短时、限定路径的 Token 直接上传到 `private-diary`；浏览器永远不能得到 Service Role Key。
4. `POST /api/private/food/uploads/complete` 再次验证 Session 和同源请求，服务器核对对象数量、路径、MIME、大小与图片尺寸。
5. 数据库事务写入/确认组与图片记录，并把组状态改为 `ready`。
6. 任一步失败时删除本次已上传对象并回滚草稿；用户中途关闭页面产生的过期草稿需要可安全清理。

初始化与完成接口必须具备幂等性。相同完成请求重复提交不能生成第二组记录。

### 10.3 服务端校验

- 所有 Food API 与 Service 方法先调用现有 Session 校验。
- 所有改变状态的请求使用现有同源校验，拒绝跨站请求。
- 服务端重新校验数量、MIME、扩展名、单文件/总大小、字符串长度、评分、时间、地区代码和 UUID。
- 不信任客户端提交的 `storage_path`、组 ID 与图片 ID 组合关系。
- 必要时检查文件头或实际图片解码结果，不能只相信浏览器提供的 MIME。
- 错误响应不得包含 Service Role Key、内部 SQL、完整 Storage Token 或其他私密配置。

### 10.4 删除与孤儿文件

本阶段不要求提供删除 UI，但上传失败必须清理本次产生的对象。未来删除整组时应先记录精确路径，删除数据库记录和所有 Storage 对象；若 Storage 删除失败，不得悄悄留下数据库与文件状态不一致。

## 11. 统计面板

### 11.1 打开方式

- 左下角固定“统计”按钮，与右侧新增按钮保持视觉平衡。
- 点击后使用平滑滚动回到 Food 内容顶部，并在标题区与画廊之间展开统计面板；画廊自然下移。
- 再次点击或点击面板内“收起”可关闭。
- 使用 `scroll-margin-top` 避开 Navbar；`prefers-reduced-motion` 时直接跳转，不平滑滚动。

### 11.2 必须包含

- 总美食组数与总图片数。
- 分类排行榜：按组数统计，显示前 5～10 项及占比。
- 地点排行榜：国家、省/州、城市至少提供城市排行和国家汇总。
- 平均评分、五星记录数和评分分布。
- 按年/月的记录时间线，体现共同记录的变化。

### 11.3 纪念性统计

在数据足够时展示：

- 第一条美食记录的日期，以及距今累计天数。
- 去过多少个国家和城市。
- 最常记录的分类与城市。
- 重复去过最多的城市或地点。
- “往年今日”：月日相同的历史记录；没有命中时不显示空模块。
- 最近一年新增的组数和图片数。

所有模块必须处理 0 条、1 条和大量记录，不生成误导性的除零百分比或 `NaN`。

### 11.4 图表实现

- 优先使用可访问的 HTML、CSS 条形图或轻量 SVG，不为简单统计引入大型图表库。
- 图表同时提供文本数值或表格，不能只靠颜色和图形传达信息。
- 地点与分类使用稳定代码/标准化文字聚合。
- 统计可以在服务器 Service Layer 中完成；客户端只接收当前已登录用户需要展示的聚合结果。

## 12. 组件与文件拆分建议

具体命名可微调，但不得把交互、上传和统计全部塞回 `FoodGrid.tsx`：

```text
src/
├── app/
│   ├── api/private/food/uploads/
│   │   ├── init/route.ts
│   │   └── complete/route.ts
│   └── yfxl99/(protected)/food/page.tsx
├── components/private/food/
│   ├── FoodGallery.tsx
│   ├── FoodCard.tsx
│   ├── FoodDetailDialog.tsx
│   ├── FoodUploadDialog.tsx
│   ├── FoodImagePicker.tsx
│   ├── FoodLocationPicker.tsx
│   ├── FoodStatsPanel.tsx
│   └── FoodFloatingActions.tsx
├── lib/food/
│   ├── exif.ts
│   ├── statistics.ts
│   └── validation.ts
├── services/foodService.ts
└── types/index.ts

supabase/migrations/<timestamp>_food_groups_and_images.sql
```

- Food 页面继续是 Server Component，负责鉴权后的首屏数据读取。
- 只有卡片交互、Dialog、文件选择、EXIF 和上传进度组件使用 `"use client"`。
- Service Layer 负责数据库与 Signed URL，不把 Supabase Service Role 逻辑放进组件。
- 执行时若修改 Next.js 路由或配置，必须先阅读本项目 `node_modules/next/dist/docs/` 中对应版本文档。

## 13. 响应式、性能与稳定性

- 手机、平板和桌面均不得横向溢出。
- 画廊存在大量图片时避免一次性优先加载全部原图。
- Signed URL 应批量生成并限制并发，单张失败不能阻塞所有图片。
- 卡片翻转状态、详情状态与上传状态不得导致整页不必要重渲染。
- Dialog 关闭、路由切换或组件卸载时清理 Pointer Timer、Object URL、事件监听器和上传请求。
- 本地预览 Object URL 使用完后调用 `URL.revokeObjectURL()`。
- 页面重新验证时不要丢失正在编辑但尚未提交的上传表单。
- Supabase 未配置时继续显示明确 Empty/Error 状态，新增按钮应说明暂不可上传，而不是无响应。

## 14. 可访问性与动效偏好

- 卡片可聚焦，并能用键盘完成翻转、打开详情和关闭详情。
- 星级输入使用 Radio Group 或等价语义，读屏能读出当前评分。
- 表单输入均有可见中文 Label、错误说明和 `aria-describedby` 关联。
- 上传进度使用可读状态，不能只靠颜色。
- 焦点样式清晰，颜色对比满足 WCAG AA。
- `prefers-reduced-motion` 下关闭 3D 翻转、平滑滚动和抽屉滑动，但功能保持完整。
- 统计图有文本替代，地点排行和分类排行可被读屏顺序读取。

## 15. Loading、Empty 与 Error

- 首屏保留现有私密 Loading/Error 边界。
- 空画廊显示简洁说明，并把右下新增按钮作为主要行动入口。
- 统计区无数据时显示“还没有足够记录”，不展示空坐标轴。
- 上传错误分为文件校验、网络上传、最终保存三类，并给出可执行的重试方式。
- Signed URL 过期或图片加载失败时允许刷新该图片 URL，不要求用户退出重登。
- 页面或接口错误不得回显数据库原始异常和 Storage 内部信息。

## 16. 安全边界

- `/yfxl99/food`、Food API、Food Service 全部验证现有私密 Session。
- Service Role Key 只能存在于 server-only 模块，不能进入 Client Bundle、HTML、日志或接口响应。
- `private-diary` 保持 Private；查看使用短期 Signed URL，上传使用短期且限定单一路径的 Signed Upload Token。
- 不新增 anon/authenticated 对 `food_entries`、`food_images` 或私有 Storage 的读写 Policy。
- 不保存永久图片 URL、Base64 图片或原文件二进制到 PostgreSQL。
- 不信任客户端文件名、MIME、尺寸、评分、日期、地区代码或对象路径。
- 新 API 需要同源校验、合理请求体限制和基础频率限制。
- Food 页面继续保持 `noindex,nofollow`，不得进入 sitemap。

## 17. 验收标准

### 17.1 画廊与交互

- [ ] 一组上传多张图片后，每张图片都作为独立卡片显示，且顺序正确。
- [ ] 图片比例不完全统一，桌面、平板和手机布局无横向溢出或明显跳动。
- [ ] 单击与键盘可翻转卡片；背面显示分类、地点和时间。
- [ ] 翻转使用非线性缓动，卡片宽高不变；Reduced Motion 下无 3D 旋转。
- [ ] 长按能打开详情层，正常滚动不会误触，长按后不会再次触发翻转。
- [ ] 桌面详情位于图片右侧，手机详情使用底部抽屉；同组图片可切换。
- [ ] Dialog 焦点管理、`Escape`、遮罩关闭和返回焦点均正确。

### 17.2 上传

- [ ] 一组可选择 1～12 张 JPEG/PNG/WebP，并能预览、删除和排序。
- [ ] 第一张图片有 EXIF 时间时自动填入；没有时使用当前时间；手动修改后不被覆盖。
- [ ] 分类、三级地点、发生时间、评分和点评校验清晰。
- [ ] Storage 路径严格为 `food/{groupId}/{imageId}.{extension}`。
- [ ] 上传进度、单图重试、防重复提交与取消确认可用。
- [ ] 上传失败不会留下可见的半组数据；过期草稿和孤儿对象有清理策略。

### 17.3 数据与统计

- [ ] `food_entries` 表示组，`food_images` 表示图片，旧数据迁移后数量与路径一致。
- [ ] 画廊只读取 `ready` 组；草稿不进入画廊和统计。
- [ ] 组数、图片数、分类排行、地点排行、评分和时间线口径正确。
- [ ] 多图组只增加一次美食记录统计，但按实际图片数增加照片统计。
- [ ] 0 条、1 条和大量数据下统计均无异常值。
- [ ] 统计按钮滚动到顶部并展开面板，收起后画廊恢复。

### 17.4 安全与工程质量

- [ ] 未登录页面请求重定向，未登录 API 返回 401，跨站写请求被拒绝。
- [ ] 浏览器响应和静态 Bundle 中没有 Service Role Key 或永久私有 URL。
- [ ] `private-diary` 与两张私密表不存在公开读写 Policy。
- [ ] 上传 MIME、大小、路径和数据库字段都由服务器复验。
- [ ] `npm run typecheck`、`npm run lint`、`npm run build` 全部通过。
- [ ] Chrome 中完成桌面与手机的点击、长按、上传、统计和键盘验收。
- [ ] README 记录新增文件、Migration、Storage 路径、上传限制、统计口径和手动 Supabase 步骤。

## 18. 建议执行顺序

1. 阅读项目规则与当前 Next.js 版本文档，确认现有私密鉴权和 Supabase 封装。
2. 定义 Food Group/Image 类型、纯校验函数和统计口径。
3. 编写增量 Migration，建立 `food_images`、组字段、约束、索引和旧数据回填。
4. 扩展 Food Service，批量生成 Signed URL，并先完成只读的多图 ViewModel。
5. 重构瀑布流、翻转卡片和长按详情层，完成响应式与可访问性。
6. 实现地点选择、EXIF 时间、图片排序和上传表单。
7. 实现受保护的初始化/完成上传 API、Signed Upload 与失败回滚。
8. 实现服务器统计与前端统计面板。
9. 验证 Empty/Error、Reduced Motion、Signed URL 过期和资源清理。
10. 更新 README，执行 TypeScript、Lint、生产构建、数据库与真实浏览器验收。

## 19. 非目标

- 不实现公开分享、点赞、评论、关注或社交 Feed。
- 不实现地图轨迹、自动 GPS 定位或第三方地图服务。
- 不实现视频、Live Photo、HEIC 自动转换或图片编辑器。
- 不实现复杂 CMS、多人账号或 Supabase Auth。
- 不在本阶段增加编辑/删除历史组的 UI；但数据结构不能阻碍未来增加。
- 不复制小红书或其他商业产品的代码、图标、品牌和受版权保护素材。

## 20. 执行完成后的文档要求

真正开始并完成实现后，必须同步维护 `README.md`，清楚记录：

- 新增和修改了哪些文件；
- 数据库如何从单图记录迁移为组与图片；
- 图片路径、限制、Signed Upload/Signed URL 和失败清理流程；
- EXIF 时间与地点选择的回退规则；
- 各统计指标的准确口径；
- 执行了哪些自动检查与浏览器验收；
- 哪些 Supabase Migration 或部署配置仍需项目所有者手动完成。
