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

## 服务器部署

当前项目的固定部署约定如下：

- 服务器源码目录固定为 `/opt/vue`
- 前端发布目录固定为 `/opt/1panel/www/sites/www.ccalm.xyz/index`
- 前后端都在服务器上构建
- 后端统一使用 `pm2 restart dental-api` 重启

### 日常更新流程

上传新代码覆盖 `/opt/vue` 后，在服务器执行：

```bash
cd /opt/vue
pnpm install
pnpm --dir server install
pnpm build
pnpm --dir server build
rm -rf /opt/1panel/www/sites/www.ccalm.xyz/index/*
cp -r /opt/vue/dist/. /opt/1panel/www/sites/www.ccalm.xyz/index/
pm2 restart dental-api
```

更新后检查：

```bash
pm2 list
pm2 logs dental-api --lines 50
```

### 新服务器首次部署流程

适用于全新 Ubuntu 服务器，并使用 `1Panel` 托管前端站点。

1. 安装基础环境

```bash
apt update && apt upgrade -y
apt install -y curl wget git unzip tar
```

2. 安装 `nvm` 并安装最新 Node.js

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install node
nvm use node
npm install -g pnpm pm2
```

3. 安装 `1Panel`

```bash
bash -c "$(curl -sSL https://resource.fit2cloud.com/1panel/package/v2/quick_start.sh)"
```

4. 将项目文件放到 `/opt/vue`

保证最终目录结构类似：

```text
/opt/vue
|-- src
|-- public
|-- server
|-- package.json
`-- ...
```

5. 安装前后端依赖

```bash
cd /opt/vue
pnpm install
pnpm --dir server install
```

6. 配置后端环境变量

创建 `/opt/vue/server/.env`，至少配置：

```env
PORT=5321
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=你的数据库用户
MYSQL_PASSWORD=你的数据库密码
MYSQL_DATABASE=dental
```

7. 构建前后端

```bash
cd /opt/vue
pnpm build
pnpm --dir server build
```

8. 启动后端

```bash
cd /opt/vue/server
pm2 start dist/main.js --name dental-api
pm2 save
pm2 startup
```

执行 `pm2 startup` 输出的命令后，再运行：

```bash
pm2 save
```

9. 在 `1Panel` 中创建网站

- 域名填写 `www.ccalm.xyz`
- 网站目录使用 `1Panel` 默认生成的站点目录

```bash
rm -rf /opt/1panel/www/sites/www.ccalm.xyz/index/*
cp -r /opt/vue/dist/. /opt/1panel/www/sites/www.ccalm.xyz/index/
```

10. 在 `1Panel` 中配置反向代理

- 路径：`/api`
- 目标地址：`http://127.0.0.1:5321`

11. 在 `1Panel` 中申请并启用 HTTPS

- 域名建议使用阿里云 DNS 校验
- 启用成功后开启强制 HTTPS

12. 验证部署

```bash
pm2 list
pm2 logs dental-api --lines 50
```

浏览器访问 `https://www.ccalm.xyz`，确认前端页面和 `/api` 请求都正常。
