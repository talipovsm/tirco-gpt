@echo off
chcp 65001 >nul
rem Двойной клик: установка и запуск Tirco
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-windows.ps1"
pause
