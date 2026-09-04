# `/yfxl99/calendar` AI 日历手账

> 当前状态：数据库、月/日接口、素材浏览、AI 生成、手账编辑与预览保存已经实现。部署前需执行 Calendar migration，并配置服务端 AI 环境变量。

## 产品规则

- 日历按月展示，可切换月份；Photo 与 Food 按 `Asia/Shanghai` 的本地日期聚合。
- 不为每一天预建数据库记录。只有首次生成或保存手账时，才创建当天的 `calendar_entries`。
- 有 Photo 或 Food 的日期格高亮；已有成品时优先显示扁平化 Preview。
- 点击有素材或手账的日期，弹出卡牌浏览当天 Photo、Food、图片及评论。
- 用户可取消不希望发送给 AI 的素材，并填写最多 2000 字的补充要求。
- AI 根据选中图片、内容、评论和补充要求生成 Cover、手账文字及零张或多张贴纸。
- 生成结果先进入草稿编辑器。文字和贴纸可拖动，贴纸可缩放、旋转，并支持方向键移动。
- 编辑画布、Cover 裁切区域、保存后的 Preview 和日历日期格共享 `CALENDAR_ENTRY_ASPECT_RATIO = 1`，始终为 `1:1`。

## 数据库

迁移文件：`supabase/migrations/202609040001_calendar_journal.sql`。

### `calendar_entries`

每个用户每天最多一条记录，唯一键为 `(owner_user_id, entry_date)`。保存：

- 日期、时区与 `draft / generating / ready / failed` 状态；
- 用户补充、AI 原始文字和最终文字；
- 实际使用的 Photo、Food、图片和评论快照 `source_manifest`；
- 使用归一化坐标的可编辑 `layout_json`；
- provider、模型、提示词版本、生成时间等 `generation_meta`；
- 安全的最近错误摘要及创建、更新时间。

### `calendar_assets`

保存 `cover / sticker / preview` 的资源元数据。文件使用现有私有存储，路径为：

```text
calendar/{ownerUserId}/{entryId}/{assetId}.{extension}
```

每条手账最多一个当前 Cover 和 Preview，可有多张贴纸。API Key 不进入数据库、布局、日志或浏览器响应。

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

## 一致性约束

- 月视图的素材高亮动态聚合，不创建空记录。
- 服务端校验日期、来源数量、文字长度、资源归属及 `1:1` 布局结构。
- 重新生成先上传新资源，成功后再替换旧资源；失败时恢复原有成品与布局。
- 保存提交 `updated_at` 进行乐观并发控制，避免旧页面覆盖新布局。
- 月视图只加载 Preview，不重新组合 Cover、文字和贴纸。
