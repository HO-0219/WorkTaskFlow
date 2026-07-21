@echo off
chcp 65001 > nul
title Git Pull Request Helper

:: ==========================================
:: [설정] GitHub 저장소 웹 주소 및 메인 브랜치 (아래 주소를 변경해 주세요)
:: ==========================================
set REPO_WEB_URL=https://github.com/HO-0219/WorkTaskFlow
set MAIN_BRANCH=main

echo ==========================================
echo           4. Open Pull Request
echo ==========================================

for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%i

echo 현재 작업 브랜치: [%CURRENT_BRANCH%]
echo 대상 브랜치:     [%MAIN_BRANCH%]
echo.

:: GitHub CLI(gh)가 설치된 환경이라면 CLI로 오픈
where gh >nul 2>nul
if %errorlevel% equ 0 (
    gh pr create --web --base %MAIN_BRANCH% --head %CURRENT_BRANCH%
    pause
    exit /b
)

:: 브라우저에서 바로 PR 작성 페이지 열기
set PR_URL=%REPO_WEB_URL%/compare/%MAIN_BRANCH%...%CURRENT_BRANCH%?expand=1

echo [알림] 브라우저에서 PR 페이지를 열고 있습니다...
start %PR_URL%

echo [완료] 웹 브라우저에서 PR 작성을 진행해 주세요.
pause