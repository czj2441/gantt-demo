#!/usr/bin/env bash
set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "  HR Gantt Demo - 环境部署脚本"
echo "=========================================="
echo ""

echo "[1/5] 检查 npm 是否安装..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[错误]${NC} 未检测到 npm，请先安装 Node.js"
    echo "  下载地址: https://nodejs.org/"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo "       npm 版本: $NPM_VERSION"
echo ""

# 检查 submodule 是否存在
if [ ! -f "gantt/package.json" ]; then
    echo -e "${RED}[错误]${NC} gantt submodule 不存在，请先执行:"
    echo "  git submodule update --init --recursive"
    exit 1
fi

echo "[2/5] 安装外层依赖..."
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}[错误]${NC} 外层依赖安装失败"
    exit 1
fi
echo -e "       ${GREEN}完成${NC}"
echo ""

echo "[3/5] 安装 gantt submodule 依赖..."
cd gantt
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}[错误]${NC} gantt 依赖安装失败"
    exit 1
fi
echo -e "       ${GREEN}完成${NC}"
echo ""

echo "[4/5] 构建 gantt dist 文件..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}[错误]${NC} gantt 构建失败"
    exit 1
fi
echo -e "       ${GREEN}完成${NC}"
echo ""

cd "$SCRIPT_DIR"

echo "[5/5] 安装 Playwright 浏览器..."
npx playwright install chromium
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}[警告]${NC} Playwright 浏览器安装失败，测试功能可能不可用"
else
    echo -e "       ${GREEN}完成${NC}"
fi
echo ""

echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "可用命令:"
echo "  npm run test    - 运行 Playwright 测试"
echo "  npx serve       - 启动本地服务器预览页面"
echo ""
