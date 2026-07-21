@echo off
title Git Commit and Push Script

set MAIN_BRANCH=main

echo ==========================================
echo       3. Git Add -> Commit -> Push
echo ==========================================

:: 1. 현재 브랜치 가져오기
for /f "delims=" %%i in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set CURRENT_BRANCH=%%i

if "%CURRENT_BRANCH%"=="" (
    echo [ERROR] Git repository not found!
    echo Please run this file inside WorkTaskFlow folder.
    echo ==========================================
    pause
    exit /b
)

echo Current Branch: [%CURRENT_BRANCH%]
echo.

:: 2. main 브랜치 푸시 차단
if "%CURRENT_BRANCH%"=="%MAIN_BRANCH%" (
    echo [BLOCKED] You are on '%MAIN_BRANCH%' branch!
    echo Direct push to main is blocked.
    echo Please run 2_select_branch.bat to switch your branch.
    echo ==========================================
    pause
    exit /b
)

:: 3. 파일 변경 상태 확인
echo [1/3] Checking file status...
git status -s
echo ------------------------------------------

set /p COMMIT_MSG="Enter commit message: "

if "%COMMIT_MSG%"=="" (
    echo [ERROR] Commit message cannot be empty!
    pause
    exit /b
)

:: 4. Add, Commit, Push 실행
echo.
echo [2/3] Adding and committing changes...
git add .
git commit -m "%COMMIT_MSG%"

echo.
echo [3/3] Pushing to GitHub...
git push origin %CURRENT_BRANCH%

echo.
echo ==========================================
echo [SUCCESS] Pushed to [%CURRENT_BRANCH%]!
echo Now run 4_pull_request.bat to create PR.
echo ==========================================
pause