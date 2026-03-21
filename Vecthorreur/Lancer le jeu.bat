@echo off
cd /d "%~dp0"
echo Lancement de VectHorreur...
start "" "http://localhost:5173"
npm run dev
