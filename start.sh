#!/usr/bin/env bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "  HR Gantt Demo 服务启动脚本"
echo "========================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误]${NC} 未检测到 Node.js，请先安装"
    echo "  下载地址: https://nodejs.org/"
    exit 1
fi

# 检查 gantt dist 是否存在
if [ ! -f "gantt/dist/frappe-gantt.umd.js" ]; then
    echo -e "${YELLOW}[提示]${NC} gantt dist 文件不存在，请先运行部署脚本:"
    echo "  ./setup.sh"
    echo ""
    read -p "是否继续启动服务? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
    echo ""
fi

echo "正在启动服务..."
echo ""

node server.js
