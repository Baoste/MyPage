# Tools 模块说明

本文档记录公开 Tools 目录、当前故事编辑器模块、数据存储和删除行为。当前实现不依赖 Firebase，也不需要 Supabase Migration。

## 1. 页面与路由

| 路径 | 用途 |
| --- | --- |
| `/tools` | Tools 目录页，以卡片展示所有可用模块 |
| `/tools/story-editor` | 剧情卡工作台详情页，包含模块说明和删除入口 |
| `/tools/modules/story-editor` | 受控读取独立编辑器 HTML，供详情页 iframe 使用 |
| `/api/tools/modules/story-editor/data` | 故事数据读取与保存 API |
| `/api/tools/modules/story-editor/delete` | 模块删除 API |

访问公开导航中的 `Tools` 时，用户先进入 `/tools`，不会直接打开编辑器 HTML。点击对应卡片后才进入 `/tools/story-editor`。

## 2. 当前模块注册信息

注册表位于 `src/lib/tools/module-store.ts`：

```ts
const TOOL_MODULES = {
  "story-editor": {
    title: "剧情卡工作台",
    author: "张紫轩",
    category: "故事设计",
    description: "整理世界观、地点、角色与事件，并在时间轴中编排完整剧情。",
    deletePassword: "8812345",
  },
} as const;
```

字段含义：

| 字段 | 当前值 | 用途 |
| --- | --- | --- |
| 模块 ID | `story-editor` | URL、数据目录和停用标记的稳定标识 |
| 标题 | `剧情卡工作台` | 目录卡片和详情页标题 |
| 署名 | `张紫轩` | 目录卡片和详情页作者信息 |
| 分类 | `故事设计` | 目录卡片的类别标签 |
| 简介 | `整理世界观、地点、角色与事件，并在时间轴中编排完整剧情。` | 卡片和详情页说明 |
| 删除口令 | `8812345` | 删除接口在服务端进行明文比较，不做哈希 |

删除口令没有以 `NEXT_PUBLIC_` 环境变量或客户端属性暴露，也不会进入 `.next/static` 浏览器资源。生产环境必须使用 HTTPS，避免明文口令在传输过程中被截获。

## 3. 模块代码位置

故事编辑器的独立可执行代码位于：

```text
tool-modules/story-editor/index.html
```

该目录不在 `public/` 下，浏览器不能通过静态文件地址直接读取。服务端只有在模块存在且未停用时，才通过 `/tools/modules/story-editor` 返回 HTML。

通用宿主代码位于：

```text
src/app/(public)/tools/
src/components/tools/
src/app/api/tools/modules/
src/lib/tools/
```

通用宿主负责目录、卡片、详情页、数据 API 和删除流程；编辑器本身保留在独立的 `tool-modules/story-editor/` 目录。

## 4. JSON 数据存储

存储根目录由服务端环境变量决定：

```env
TOOLS_STORAGE_ROOT=/data/mypage/tools
```

最终故事数据文件是：

```text
TOOLS_STORAGE_ROOT/story-editor/data.json
```

例如配置：

```env
TOOLS_STORAGE_ROOT=/data/mypage/tools
```

对应文件为：

```text
/data/mypage/tools/story-editor/data.json
```

系统不会在 `TOOLS_STORAGE_ROOT` 后再次自动添加 `tools/`。如果没有配置该变量，开发环境默认使用：

```text
项目根目录/.data/tools/story-editor/data.json
```

数据采用临时文件加重命名的方式原子写入。编辑器页面每 3 秒检查一次服务器更新，避免依赖 Firebase 实时数据库。

## 5. 删除流程

用户在 `/tools/story-editor` 点击“删除模块”，输入明文口令 `8812345` 后，服务端按以下顺序处理：

1. 校验请求来源必须与当前站点同源。
2. 应用按客户端 IP 统计的删除尝试限流。
3. 在服务端直接比较明文删除口令。
4. 删除 `TOOLS_STORAGE_ROOT/story-editor/` 数据目录。
5. 写入 `TOOLS_STORAGE_ROOT/.deleted/story-editor.json` 停用标记。
6. 尝试只删除 `tool-modules/story-editor/` 模块代码目录。
7. Tools 目录页重新读取状态后，不再渲染该模块卡片。
8. 模块详情、HTML 读取路由和数据 API 返回不可用状态。

停用标记的结构类似：

```json
{
  "deletedAt": "2026-09-02T00:00:00.000Z"
}
```

## 6. 可写部署与只读部署

### 源码目录可写

在普通 Node.js 或腾讯云 CVM 部署中，如果运行 Node 的系统用户拥有删除权限，`tool-modules/story-editor/` 会被物理删除。数据目录也会被清空，目录卡片随即隐藏。

### 源码目录只读或构建不可变

在 Serverless、只读容器或不可变构建中，运行时可能无法物理删除已经部署的模块代码。此时：

- 故事 JSON 数据仍会被清空；
- 停用标记仍会写入持久存储；
- 目录卡片不再显示；
- 模块详情、HTML 和数据 API 均被停用；
- 物理代码需要在下一次部署时从构建源中移除。

因此生产环境必须把 `TOOLS_STORAGE_ROOT` 指向可持续写入的持久磁盘，否则重新部署后停用标记可能丢失。

## 7. 当前解耦边界

删除成功后，故事编辑器 HTML 和 JSON 数据可以被物理清理，Tools 目录也不会继续显示对应卡片。不过，当前注册表中的以下少量信息仍保留在 `src/lib/tools/module-store.ts`：

- 模块 ID；
- 标题；
- 署名；
- 分类；
- 简介；
- 删除口令。

通用 Tools 卡片组件、详情页和 API 也会保留，因为它们是后续其他模块共用的宿主基础设施。如果要求删除模块时连注册信息也物理消失，应把注册信息迁移到 `tool-modules/story-editor/manifest.json`，并由目录页动态发现 manifest。这样删除整个模块目录时，HTML 和注册信息会一起消失。

## 8. 新增模块时需要修改的位置

按照当前注册表方案，新增模块至少需要：

1. 在 `tool-modules/{module-id}/` 放置模块入口文件；
2. 在 `src/lib/tools/module-store.ts` 的 `TOOL_MODULES` 中添加安全元数据和删除口令；
3. 确认模块的数据格式可由通用数据 API 接受；
4. 使用独立的 `TOOLS_STORAGE_ROOT/{module-id}/` 数据目录；
5. 验证目录卡片、详情页、同源保存、停用标记和精确目录删除。

不要把模块文件放回 `public/`，否则只读部署中即使目录页隐藏，旧静态 URL 仍可能直接访问文件。

## 9. Linux 手动删除与注册信息清理

下面的流程用于腾讯云 CVM 或其他可写的 Linux Node.js 服务器。执行前应先确认实际项目目录、`TOOLS_STORAGE_ROOT` 和服务名称，不要直接复制示例路径到不同环境。

以下示例假设：

```text
项目目录=/var/www/mypage
TOOLS_STORAGE_ROOT=/data/mypage/tools
systemd 服务名=mypage
```

### 9.1 停止服务并核对路径

先停止正在读写模块的 Node.js 进程：

```bash
sudo systemctl stop mypage
```

设置本次操作使用的两个明确路径：

```bash
TOOLS_PROJECT_DIR=/var/www/mypage
TOOLS_DATA_ROOT=/data/mypage/tools
```

分别核对项目和数据目录：

```bash
realpath "$TOOLS_PROJECT_DIR"
realpath "$TOOLS_DATA_ROOT"
ls -la "$TOOLS_PROJECT_DIR/tool-modules/story-editor"
ls -la "$TOOLS_DATA_ROOT/story-editor"
```

只有在输出与预期绝对路径完全一致时才继续。`TOOLS_PROJECT_DIR` 和 `TOOLS_DATA_ROOT` 不能是空值、`/`、用户主目录或项目的上级大目录。

### 9.2 写入停用标记

先写入停用标记，避免删除中途重启后模块重新出现：

```bash
mkdir -p "$TOOLS_DATA_ROOT/.deleted"
printf '{"deletedAt":"manual"}\n' > "$TOOLS_DATA_ROOT/.deleted/story-editor.json"
```

### 9.3 删除独立数据和模块代码

再次打印两个精确目标：

```bash
realpath -m "$TOOLS_DATA_ROOT/story-editor"
realpath -m "$TOOLS_PROJECT_DIR/tool-modules/story-editor"
```

确认无误后，只删除这两个明确目录：

```bash
rm -rf -- "$TOOLS_DATA_ROOT/story-editor"
rm -rf -- "$TOOLS_PROJECT_DIR/tool-modules/story-editor"
```

不要删除整个 `TOOLS_DATA_ROOT`、`tool-modules/`、项目根目录或使用通配符。

### 9.4 清除注册信息

打开：

```text
/var/www/mypage/src/lib/tools/module-store.ts
```

从 `TOOL_MODULES` 中删除完整的 `story-editor` 项：

```ts
"story-editor": {
  title: "剧情卡工作台",
  author: "张紫轩",
  category: "故事设计",
  description: "整理世界观、地点、角色与事件，并在时间轴中编排完整剧情。",
  deletePassword: "8812345",
},
```

如果它是最后一个模块，注册表应保留为空对象，不要删除 `TOOL_MODULES` 本身：

```ts
const TOOL_MODULES: Record<string, ToolModuleDefinition> = {};
```

这样通用 Tools 目录仍可正常工作，并显示“暂时没有可用工具”；标题、署名、简介和删除口令则不再存在于注册表中。

### 9.5 构建并重新启动

在项目目录执行完整检查：

```bash
cd "$TOOLS_PROJECT_DIR"
npm run lint
npm run typecheck
npm run build
sudo systemctl start mypage
```

确认以下结果：

- `/tools` 不再显示“剧情卡工作台”卡片；
- `/tools/story-editor` 返回 404；
- `/tools/modules/story-editor` 返回 404；
- `/api/tools/modules/story-editor/data` 返回 404；
- `tool-modules/story-editor/` 不存在；
- `TOOLS_STORAGE_ROOT/story-editor/` 不存在。

### 9.6 最后清除停用标记

注册信息已经从新构建中移除、服务也已成功重启后，停用标记不再是必需文件。确认目标路径后可以删除：

```bash
rm -f -- "$TOOLS_DATA_ROOT/.deleted/story-editor.json"
```

如果服务器可能回滚到仍包含旧注册表的构建，建议继续保留该停用标记；否则回滚后模块可能重新启用。
