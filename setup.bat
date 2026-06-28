@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ==========================================
echo   HR Gantt Demo - 环境部署脚本
echo ==========================================
echo.

REM 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo [1/5] 检查 npm 是否安装...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 npm，请先安装 Node.js
echo   下载地址: https://nodejs.org/
    exit /b 1
)
for /f "tokens=*" %%a in ('npm --version') do set "NPM_VERSION=%%a"
echo        npm 版本: %NPM_VERSION%
echo.

REM 检查 submodule 是否存在
if not exist "gantt\package.json" (
    echo [错误] gantt submodule 不存在，请先执行:
    echo   git submodule update --init --recursive
    exit /b 1
)

echo [2/5] 安装外层依赖...
call npm install
if errorlevel 1 (
    echo [错误] 外层依赖安装失败
    exit /b 1
)
echo        完成
echo.

echo [3/5] 安装 gantt submodule 依赖...
cd gantt
call npm install
if errorlevel 1 (
    echo [错误] gantt 依赖安装失败
    exit /b 1
)
echo        完成
echo.

echo [4/5] 构建 gantt dist 文件...
call npm run build
if errorlevel 1 (
    echo [错误] gantt 构建失败
    exit /b 1
)
echo        完成
echo.

cd /d "%SCRIPT_DIR%"

echo [5/5] 安装 Playwright 浏览器...
call npx playwright install chromium
if errorlevel 1 (
    echo [警告] Playwright 浏览器安装失败，测试功能可能不可用
) else (
    echo        完成
)
echo.

echo ==========================================
echo   部署完成！
echo ==========================================
echo.
echo 可用命令:
echo   npm run test    - 运行 Playwright 测试
echo   npx serve       - 启动本地服务器预览页面
echo.

pause
