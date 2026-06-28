@echo off
chcp 65001 >nul
setlocal

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo ========================================
echo   HR Gantt Demo 服务启动脚本
echo ========================================
echo.

REM 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装
echo   下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查 gantt dist 是否存在
if not exist "gantt\dist\frappe-gantt.umd.js" (
    echo [提示] gantt dist 文件不存在，请先运行部署脚本:
    echo   setup.bat
    echo.
    choice /C YN /M "是否继续启动服务 (Y/N)"
    if errorlevel 2 exit /b 0
    echo.
)

echo 正在启动服务...
echo.

node server.js

endlocal
