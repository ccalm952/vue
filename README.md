# 测试

本项目在根目录放置 Vue 3 前端，在 `server/` 目录放置 NestJS 后端。

## 环境要求

- Node.js `>=22.0.0`
- pnpm `10.33.0`

## 快速开始

分别安装前后端依赖：

```bash
pnpm install
pnpm --dir server install
```

启动前端：

```bash
pnpm dev
```

在另一个终端启动后端：

```bash
pnpm dev:server
```

前端默认运行在 `http://127.0.0.1:5173`，并把 `/api` 代理到 `http://127.0.0.1:5321`。

## 根目录脚本

- `pnpm dev`：启动前端开发服务
- `pnpm dev:server`：启动后端开发服务
- `pnpm build`：构建前端
- `pnpm build:server`：构建后端
- `pnpm preview`：预览前端构建产物
- `pnpm lint`：只检查不自动修复
- `pnpm lint:fix`：检查并自动修复
- `pnpm format`：格式化前后端源码

## 项目结构

```text
.
|-- public/          前端静态资源
|-- src/             Vue 前端源码
|   |-- api/         HTTP 请求封装
|   |-- components/  可复用组件与业务组件
|   |-- composables/ Vue 组合式函数
|   |-- config/      前端配置常量
|   |-- layouts/     布局组件
|   |-- router/      路由定义
|   |-- stores/      Pinia 状态管理
|   |-- styles/      共享样式
|   |-- utils/       工具函数
|   `-- views/       路由页面
`-- server/          NestJS 后端源码与构建配置
    |-- src/common/  后端通用能力
    `-- src/modules/ 后端业务模块
```

## 开发约定

### 命名规范

- 组件文件使用 `PascalCase`，例如 `PatientAddEditDialog.vue`
- 页面文件使用 `kebab-case`，并按业务模块归档到 `src/views/`
- composable 文件使用 `useXxx.ts`
- store 文件使用 `kebab-case`，并统一以 `-store.ts` 结尾
- `config`、`utils`、`api` 文件使用 `kebab-case`
- 前端页面展示统一使用 `planting` 这一业务命名；后端接口路径当前仍保留 `/implant/...`

### 目录职责

- `views/` 只放路由级页面
- `components/` 放可复用组件或页面拆出来的业务组件
- `api/` 负责请求封装，不放页面状态逻辑
- `stores/` 放跨页面共享状态
- `utils/` 放纯工具函数
- `config/` 放常量、时间规则和导航配置

### 文本与编码

- 注释和界面文案优先使用中文
- 文本文件统一保存为 UTF-8

## 说明

- `src/auto-imports.d.ts` 和 `src/components.d.ts` 由 Vite 插件自动生成
- `server/dist/` 是构建产物，不应手动编辑
