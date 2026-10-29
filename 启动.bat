@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   AI 漫剧剧本生成器 · 本地工作台
echo   ------------------------------------
echo   正在启动 http://127.0.0.1:5178
echo.
start "" http://127.0.0.1:5178
node server.js
pause
