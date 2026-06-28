# 人力资源 Gantt 图 Demo

基于 [Frappe Gantt](https://github.com/frappe/gantt) 的人力资源任务可视化演示项目，支持单图模式（全员合并）和多图模式（按人分图），并附带可编辑任务表格实现双向数据同步。

---

## 目录

- [功能特性](#功能特性)
- [项目结构](#项目结构)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [手动构建](#手动构建)
  - [1. 克隆项目](#1-克隆项目)
  - [2. 初始化 Submodule](#2-初始化-submodule)
  - [3. 构建 Gantt 库](#3-构建-gantt-库)
  - [4. 启动服务](#4-启动服务)
- [开发 Workflow](#开发-workflow)
- [测试](#测试)
- [常见问题](#常见问题)

---

## 功能特性

- **单图模式**：所有 30 个任务（5 人 × 6 任务）在一个 Gantt 图中展示，颜色区分人员
- **多图模式**：每人一个独立的 Gantt 图，便于个人任务管理
- **可编辑任务表格**：任务名、开始时间、结束时间支持在线编辑，与 Gantt 图双向同步
- **周末高亮**：一键开关周末背景高亮
- **线性粒度控制**：滑块调节时间列宽，支持 20px ~ 100px 范围
- **依赖箭头**：任务间的依赖关系通过 SVG 箭头可视化

---

## 项目结构

```
.
├── gantt/                  ← git submodule: Frappe Gantt 库
│   ├── src/                ← 源码
│   ├── dist/               ← 构建产物 (不在 git 中，需手动构建)
│   └── package.json
│
├── tests/                  ← Playwright E2E 测试
│   └── hr-demo.spec.js
│
├── server.js               ← 零依赖 Node.js 静态服务器
├── start.bat / start.sh    ← 服务启动脚本
├── setup.bat / setup.sh    ← 环境部署脚本
│
├── hr-demo.html            ← Demo 主页面
├── hr-demo.css             ← 样式文件
├── hr-data.js              ← 测试数据生成器
├── package.json            ← 外层依赖 (Playwright)
└── playwright.config.js    ← 测试配置
```

---

## 环境要求

| 工具 | 版本 | 用途 |
|---|---|---|
| [Node.js](https://nodejs.org/) | >= 18 | 运行构建工具和服务 |
| [npm](https://www.npmjs.com/) | >= 9 | 包管理 |
| [Git](https://git-scm.com/) | >= 2.34 | 版本控制 (含 submodule 支持) |

---

## 快速开始

### Windows

```powershell
# 1. 克隆项目（含 submodule）
git clone --recurse-submodules <仓库URL>
cd <项目目录>

# 2. 一键部署依赖
.\setup.bat

# 3. 启动服务
.\start.bat
```

### Linux / macOS

```bash
# 1. 克隆项目（含 submodule）
git clone --recurse-submodules <仓库URL>
cd <项目目录>

# 2. 一键部署依赖
chmod +x setup.sh
./setup.sh

# 3. 启动服务
chmod +x start.sh
./start.sh
```

访问 http://localhost:53658/hr-demo.html

---

## 手动构建

如果一键脚本无法满足需求，可按以下步骤手动构建。

### 1. 克隆项目

```bash
# 方式一：克隆时同时拉取 submodule
git clone --recurse-submodules <仓库URL>

# 方式二：如果已克隆但缺少 submodule
git submodule update --init --recursive
```

### 2. 初始化 Submodule

进入 `gantt` 目录并切换到 `release` 分支：

```bash
cd gantt
git checkout release
cd ..
```

### 3. 构建 Gantt 库

Gantt 库的 **dist 构建产物不在 git 追踪中**，必须手动构建：

```bash
# 安装 gantt 依赖（使用 pnpm 或 npm）
cd gantt
pnpm install

# 构建 dist 文件
npm run build

cd ..
```

构建成功后，`gantt/dist/` 下会生成以下文件：

```
gantt/dist/
├── frappe-gantt.css      # 样式文件
├── frappe-gantt.es.js    # ES Module 版本
└── frappe-gantt.umd.js   # UMD 版本 (hr-demo.html 使用此文件)
```

> **注意**：gantt 项目原生使用 `pnpm`，推荐使用 `pnpm install` 而非 `npm install`，以避免生成多余的 `package-lock.json`。

### 4. 安装外层依赖

```bash
# 外层目录下
npm install
```

外层仅包含 [Playwright](https://playwright.dev/) 测试相关依赖。

### 5. 启动服务

```bash
# 方式一：使用提供的脚本
.\start.bat         # Windows
./start.sh          # Linux/macOS

# 方式二：直接运行 server.js
node server.js

# 方式三：自定义端口
set PORT=8080 && node server.js     # Windows
PORT=8080 node server.js            # Linux/macOS
```

---

## 开发 Workflow

### 修改 Gantt 库源码

如果需要修改 `gantt/src/` 下的源码（如 `index.js`、`bar.js` 等），修改后必须重新构建：

```bash
cd gantt
npm run build
```

构建产物会自动更新到 `gantt/dist/`，刷新浏览器即可生效。

### 修改 Demo 页面

直接编辑 `hr-demo.html` 或 `hr-demo.css`，无需构建，刷新浏览器即可。

### 添加测试

测试文件位于 `tests/hr-demo.spec.js`，使用 Playwright 编写：

```bash
# 运行测试
npx playwright test --config=playwright.config.js

# 查看测试报告
npx playwright show-report
```

---

## 测试

项目包含 21 个 Playwright E2E 测试，覆盖：

| 测试类别 | 数量 | 说明 |
|---|---|---|
| 页面渲染 | 6 | 标题、图例、图表、颜色 class |
| 多图模式 | 3 | 卡片渲染、bar 颜色 |
| 工具栏 | 2 | 滑块、开关、按钮 |
| 周末高亮 | 3 | 开启/关闭状态 |
| 线性粒度 | 3 | 滑块调节、值同步 |
| 表格同步 | 3 | 渲染、任务名同步、日期同步 |
| 文案检查 | 1 | 确认无旧方案 A/B 字样 |

---

## 常见问题

### Q1: 克隆后页面报 404（`frappe-gantt.umd.js` 不存在）

**原因**：`gantt/dist/` 构建产物不在 git 中。  
**解决**：进入 `gantt` 目录执行 `npm run build`。

### Q2: `git status` 显示 `modified: gantt (untracked content)`

**原因**：submodule 中出现了未追踪文件（通常是 `package-lock.json` 或 `node_modules`）。  
**解决**：

```bash
cd gantt
# 删除 npm 生成的 lock 文件（项目使用 pnpm）
rm package-lock.json
# 确认工作区干净
git status
cd ..
```

### Q3: Playwright 测试报错 `net::ERR_CONNECTION_REFUSED`

**原因**：测试需要本地服务器在 `localhost:53658` 运行。  
**解决**：先运行 `./start.bat`（或 `node server.js`）启动服务，再运行测试。

### Q4: 如何在 submodule 中使用 npm 而非 pnpm？

可以，但建议加 `--no-package-lock` 避免生成多余的 `package-lock.json`：

```bash
cd gantt
npm install --no-package-lock
npm run build
```

### Q5: 端口 53658 被占用怎么办？

```bash
# Windows
set PORT=8080
.\start.bat

# Linux/macOS
PORT=8080 ./start.sh
```
