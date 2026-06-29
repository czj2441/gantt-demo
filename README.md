# 人力资源 Gantt 图 Demo

基于 [Frappe Gantt](https://github.com/frappe/gantt) 的人力资源任务可视化演示项目，支持单图模式（全员合并）和多图模式（按人分图），并附带可编辑任务表格实现双向数据同步。

---

## 功能特性

- **单图模式**：所有 30 个任务（5 人 × 6 任务）在一个 Gantt 图中展示，颜色区分人员
- **多图模式**：每人一个独立的 Gantt 图，便于个人任务管理
- **可编辑任务表格**：任务名、开始/结束时间支持在线编辑，与 Gantt 图双向同步
- **周末高亮**：一键开关周末背景高亮
- **线性粒度控制**：滑块调节时间列宽（20px ~ 100px）
- **依赖箭头**：任务间的依赖关系通过 SVG 箭头可视化

---

## 项目结构

```
.
├── gantt/                  ← git submodule: Frappe Gantt 库
│   ├── src/                ← 源码
│   ├── dist/               ← 构建产物 (不在 git 中，由 setup 生成)
│   └── package.json
├── tests/                  ← Playwright E2E 测试
├── server.js               ← 零依赖 Node.js 静态服务器
├── setup.bat / setup.sh    ← 一键部署脚本
├── start.bat / start.sh    ← 服务启动脚本
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
| [Git](https://git-scm.com/) | >= 2.34 | 版本控制 (含 submodule 支持) |

---

## 快速开始

### Windows

```powershell
git clone --recurse-submodules <仓库URL>
cd <项目目录>
.\setup.bat    # 安装依赖 + 构建 gantt + 安装 Playwright 浏览器
.\start.bat    # 启动本地服务器
```

### Linux / macOS

```bash
git clone --recurse-submodules <仓库URL>
cd <项目目录>
chmod +x setup.sh start.sh
./setup.sh     # 安装依赖 + 构建 gantt + 安装 Playwright 浏览器
./start.sh     # 启动本地服务器
```

访问 http://localhost:53658/hr-demo.html

> **如果已克隆但缺少 submodule**：执行 `git submodule update --init --recursive`

---

## setup 脚本做了什么

| 步骤 | 操作 | 说明 |
|---|---|---|
| 1 | 检查 npm | 确认 Node.js 已安装 |
| 2 | 检查 submodule | 确认 `gantt/package.json` 存在 |
| 3 | `npm install`（根目录） | 安装 Playwright 等外层依赖 |
| 4 | `npm install`（gantt/） | 安装 Vite 等构建依赖 |
| 5 | `npm run build`（gantt/） | 生成 `dist/frappe-gantt.{css,es.js,umd.js}` |
| 6 | `npx playwright install chromium` | 安装测试浏览器（可选） |

---

## 开发

### 修改 Gantt 库源码

修改 `gantt/src/` 下的文件后需重新构建：

```bash
cd gantt
npm run build
```

### 修改 Demo 页面

直接编辑 `hr-demo.html` 或 `hr-demo.css`，刷新浏览器即可。

### 运行测试

```bash
# 先启动服务器
.\start.bat          # 或 ./start.sh

# 运行 Playwright 测试
npx playwright test

# 查看报告
npx playwright show-report
```

---

## 常见问题

**Q: 克隆后页面报 404（`frappe-gantt.umd.js` 不存在）**

`gantt/dist/` 构建产物不在 git 中，运行 `setup.bat` / `setup.sh` 即可生成。

**Q: `git status` 显示 `modified: gantt (untracked content)`**

submodule 中出现了未追踪文件。常见原因是 setup 脚本使用 `npm install` 在 gantt 目录中生成了 `package-lock.json`（gantt 上游使用 pnpm）。此文件不影响功能，可安全删除：

```bash
cd gantt && rm package-lock.json && cd ..
```

**Q: Playwright 测试报错 `net::ERR_CONNECTION_REFUSED`**

测试需要本地服务器运行在 `localhost:53658`，先执行 `start.bat` / `start.sh` 启动服务。

**Q: 端口 53658 被占用**

自定义端口启动：

```bash
# Windows (PowerShell)
$env:PORT=8080; node server.js

# Linux/macOS
PORT=8080 ./start.sh
```
